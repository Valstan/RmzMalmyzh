import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ContactForm from "@/components/ContactForm";
import ContentHtml from "@/components/ContentHtml";
import { getAllPages, getPage } from "@/lib/cms";
import { legacyGenre } from "@/lib/novosti/legacy";
import { OG_DEFAULT_IMAGE, SITE } from "@/lib/site";
import type { Page } from "@/payload-types";

type Props = { params: Promise<{ slug: string[] }> };

// ISR: контент живёт в Payload; правка в админке сбрасывает кэш (revalidateSite),
// revalidate — страховка. CI-сборка идёт с пустой БД → страницы генерятся on-demand.
export const revalidate = 3600;

const slugOf = async (params: Props["params"]) => "/" + (await params).slug.join("/") + "/";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await getPage(await slugOf(params));
  if (!page) return {};
  const title = (page.title ?? page.h1).replace(/ [-—] АО «Малмыжский ремзавод»$/, "");
  // Мусорные описания WP (типа «Звоните по телефону: tel:…» у /vakansii/) — на фолбэк (аудит §2.2)
  const description = (page.desc && !/tel:\+?\d/.test(page.desc) ? page.desc : "") ||
    `${page.h1} — АО «Малмыжский завод по ремонту дизельных двигателей», г. Малмыж. Работаем со всеми регионами России.`;
  return {
    title,
    description,
    alternates: { canonical: page.path },
    // ⚠️ Здесь стояло `openGraph: page.ogImage ? {...} : undefined`, и это стирало
    // og-теги на 127 из 128 страниц: ключ со значением undefined Next понимает не
    // как «оставь родительские», а как «обнули». Соседние маршруты (/novosti/,
    // /voprosy-i-otvety/) ключ не указывают вовсе — и теги наследуют; именно эта
    // разница дефект и маскировала. Поэтому объект собираем ЦЕЛИКОМ, повторяя
    // поля из layout: глубже верхнего уровня openGraph с родительским не сливается.
    openGraph: {
      type: "website",
      locale: "ru_RU",
      siteName: SITE.shortName,
      title,
      description,
      url: page.path,
      images: [page.ogImage || OG_DEFAULT_IMAGE],
    },
  };
}

/**
 * Раздел-родитель для записи стадии 1. Все 42 такие страницы лежат в корне
 * (`/den-polya-2020/`), поэтому по пути родителя не вычислить — берём из жанра:
 * хроника принадлежит ленте, техстатья — библиотеке. Без этой крошки оба списка
 * остаются без единой входящей ссылки с самих записей.
 */
function parentOf(page: Page): { href: string; label: string } | null {
  if (!page.isPost) return null;
  return legacyGenre(page.path) === "hronika"
    ? { href: "/novosti/", label: "Новости" }
    : { href: "/stati/", label: "Технические статьи" };
}

function Breadcrumbs({ page, pages }: { page: Page; pages: Page[] }) {
  const segs = page.path.split("/").filter(Boolean);
  const parent = parentOf(page);
  const crumbs = segs.map((_, i) => {
    const href = "/" + segs.slice(0, i + 1).join("/") + "/";
    const p = pages.find((x) => x.path === href);
    return { href, label: p?.h1 || segs[i] };
  });
  return (
    <nav aria-label="Хлебные крошки" className="text-sm text-neutral-500 mb-4">
      <Link href="/" className="hover:text-[var(--accent)]">Главная</Link>
      {parent && (
        <span>
          {" / "}
          <Link href={parent.href} className="hover:text-[var(--accent)]">{parent.label}</Link>
        </span>
      )}
      {crumbs.map((c) => (
        <span key={c.href}>
          {" / "}
          <Link href={c.href} className="hover:text-[var(--accent)]">{c.label}</Link>
        </span>
      ))}
    </nav>
  );
}

/** JSON-LD: BreadcrumbList всем, TechArticle постам, Service услугам (аудит §2.3/§3). */
function jsonLd(page: Page, pages: Page[]) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://xn--g1ajl.xn--80adkdyec4j.xn--p1ai";
  const segs = page.path.split("/").filter(Boolean);
  const parent = parentOf(page);
  const trail = [
    { "@type": "ListItem", position: 1, name: "Главная", item: base + "/" },
    ...(parent ? [{ "@type": "ListItem", position: 2, name: parent.label, item: base + parent.href }] : []),
  ];
  const graph: object[] = [
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        ...trail,
        ...segs.map((_, i) => {
          const href = "/" + segs.slice(0, i + 1).join("/") + "/";
          return {
            "@type": "ListItem",
            position: trail.length + i + 1,
            name: pages.find((x) => x.path === href)?.h1 || segs[i],
            item: base + href,
          };
        }),
      ],
    },
  ];
  if (page.isPost) {
    graph.push({
      "@type": "TechArticle",
      headline: page.h1,
      datePublished: page.publishedAt,
      inLanguage: "ru",
      author: { "@type": "Organization", name: "АО «Малмыжский завод по ремонту дизельных двигателей»" },
      mainEntityOfPage: base + page.path,
      ...(page.ogImage ? { image: base + page.ogImage } : {}),
    });
  } else if (page.path.startsWith("/uslugi/") && segs.length > 1) {
    graph.push({
      "@type": "Service",
      name: page.h1,
      provider: { "@type": "Organization", name: "АО «Малмыжский завод по ремонту дизельных двигателей»" },
      areaServed: "RU",
      url: base + page.path,
    });
  }
  return { "@context": "https://schema.org", "@graph": graph };
}

export default async function ContentPage({ params }: Props) {
  const slug = await slugOf(params);
  // Главная, лента и список статей рендерятся своими роутами. Маршрутизация
  // Next и так предпочтёт их этому catch-all; страховка — на случай страницы
  // с таким же path в БД (запись `/novosti/` стадии 1 существует и осталась).
  if (slug === "/" || slug === "/novosti/" || slug === "/stati/") notFound();
  const page = await getPage(slug);
  if (!page) notFound();
  const pages = await getAllPages();
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(page, pages)) }}
      />
      <Breadcrumbs page={page} pages={pages} />
      {page.isPost && page.publishedAt && (
        <p className="text-sm text-neutral-500 mb-2">
          {new Date(page.publishedAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      )}
      <ContentHtml html={page.html ?? ""} formSubject={`Заявка со страницы: ${page.h1}`} />
      {/* Кнопка «Сделать заказ» шапки ведёт на /kontakty/#zakaz — форма здесь
          гарантирована кодом: в харвесте стадии 1 CF7-слотов не оказалось,
          и без этого блока формы не было бы нигде на сайте. */}
      {slug === "/kontakty/" && (
        <section id="zakaz" className="mt-10">
          <h2 className="text-2xl font-bold mb-4">Сделать заказ</h2>
          <ContactForm subject="Заявка со страницы: Контакты" />
        </section>
      )}
    </div>
  );
}
