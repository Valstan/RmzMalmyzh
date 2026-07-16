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
    description: page.desc || `${page.h1} — АО «Малмыжский завод по ремонту дизельных двигателей», г. Малмыж. Работаем со всеми регионами России.`,
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

export default async function ContentPage({ params }: Props) {
  const slug = await slugOf(params);
  const page = getPage(slug);
  if (!page) notFound();
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
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
