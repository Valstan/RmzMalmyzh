import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ContactForm from "@/components/ContactForm";
import ContentHtml from "@/components/ContentHtml";
import { getAllPages, getPage } from "@/lib/cms";
import type { Page } from "@/payload-types";

type Props = { params: Promise<{ slug: string[] }> };

// ISR: контент живёт в Payload; правка в админке сбрасывает кэш (revalidateSite),
// revalidate — страховка. CI-сборка идёт с пустой БД → страницы генерятся on-demand.
export const revalidate = 3600;

const slugOf = async (params: Props["params"]) => "/" + (await params).slug.join("/") + "/";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await getPage(await slugOf(params));
  if (!page) return {};
  return {
    title: (page.title ?? page.h1).replace(/ [-—] АО «Малмыжский ремзавод»$/, ""),
    // Мусорные описания WP (типа «Звоните по телефону: tel:…» у /vakansii/) — на фолбэк (аудит §2.2)
    description: (page.desc && !/tel:\+?\d/.test(page.desc) ? page.desc : "") ||
      `${page.h1} — АО «Малмыжский завод по ремонту дизельных двигателей», г. Малмыж. Работаем со всеми регионами России.`,
    alternates: { canonical: page.path },
    openGraph: page.ogImage ? { images: [page.ogImage] } : undefined,
  };
}

function Breadcrumbs({ slug, pages }: { slug: string; pages: Page[] }) {
  const segs = slug.split("/").filter(Boolean);
  const crumbs = segs.map((_, i) => {
    const href = "/" + segs.slice(0, i + 1).join("/") + "/";
    const p = pages.find((x) => x.path === href);
    return { href, label: p?.h1 || segs[i] };
  });
  return (
    <nav aria-label="Хлебные крошки" className="text-sm text-neutral-500 mb-4">
      <Link href="/" className="hover:text-[var(--accent)]">Главная</Link>
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
  const graph: object[] = [
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Главная", item: base + "/" },
        ...segs.map((_, i) => {
          const href = "/" + segs.slice(0, i + 1).join("/") + "/";
          return {
            "@type": "ListItem",
            position: i + 2,
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
  // Главная и /novosti/ рендерятся своими роутами
  if (slug === "/" || slug === "/novosti/") notFound();
  const page = await getPage(slug);
  if (!page) notFound();
  const pages = await getAllPages();
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(page, pages)) }}
      />
      <Breadcrumbs slug={slug} pages={pages} />
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
