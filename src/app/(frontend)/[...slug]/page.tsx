import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ContentHtml from "@/components/ContentHtml";
import { contentPages, getPage, pages } from "@/lib/content";

type Props = { params: Promise<{ slug: string[] }> };

// Всё, кроме главной и /novosti/ (у новостей свой листинг)
const routed = contentPages.filter((p) => p.slug !== "/novosti/");

export function generateStaticParams() {
  return routed.map((p) => ({ slug: p.slug.split("/").filter(Boolean) }));
}

export const dynamicParams = false;

const slugOf = async (params: Props["params"]) => "/" + (await params).slug.join("/") + "/";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = getPage(await slugOf(params));
  if (!page) return {};
  return {
    title: page.title.replace(/ [-—] АО «Малмыжский ремзавод»$/, ""),
    // Мусорные описания WP (типа «Звоните по телефону: tel:…» у /vakansii/) — на фолбэк (аудит §2.2)
    description: (page.desc && !/tel:\+?\d/.test(page.desc) ? page.desc : "") ||
      `${page.h1} — АО «Малмыжский завод по ремонту дизельных двигателей», г. Малмыж. Работаем со всеми регионами России.`,
    alternates: { canonical: page.slug },
    openGraph: page.ogImage ? { images: [page.ogImage] } : undefined,
  };
}

function Breadcrumbs({ slug }: { slug: string }) {
  const segs = slug.split("/").filter(Boolean);
  const crumbs = segs.map((_, i) => {
    const href = "/" + segs.slice(0, i + 1).join("/") + "/";
    const p = pages.find((x) => x.slug === href);
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
function jsonLd(page: NonNullable<ReturnType<typeof getPage>>) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://xn--g1ajl.xn--80adkdyec4j.xn--p1ai";
  const segs = page.slug.split("/").filter(Boolean);
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
            name: pages.find((x) => x.slug === href)?.h1 || segs[i],
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
      datePublished: page.published,
      inLanguage: "ru",
      author: { "@type": "Organization", name: "АО «Малмыжский завод по ремонту дизельных двигателей»" },
      mainEntityOfPage: base + page.slug,
      ...(page.ogImage ? { image: base + page.ogImage } : {}),
    });
  } else if (page.slug.startsWith("/uslugi/") && segs.length > 1) {
    graph.push({
      "@type": "Service",
      name: page.h1,
      provider: { "@type": "Organization", name: "АО «Малмыжский завод по ремонту дизельных двигателей»" },
      areaServed: "RU",
      url: base + page.slug,
    });
  }
  return { "@context": "https://schema.org", "@graph": graph };
}

export default async function ContentPage({ params }: Props) {
  const slug = await slugOf(params);
  const page = getPage(slug);
  if (!page) notFound();
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(page)) }}
      />
      <Breadcrumbs slug={slug} />
      {page.isPost && page.published && (
        <p className="text-sm text-neutral-500 mb-2">
          {new Date(page.published).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      )}
      <ContentHtml html={page.html} formSubject={`Заявка со страницы: ${page.h1}`} />
    </div>
  );
}
