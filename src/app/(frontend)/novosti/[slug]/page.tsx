import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getNovost } from "@/lib/cms";
import { novostHref, slugFromParam } from "@/lib/novosti/feed";
import { mediaUrl } from "@/lib/mediaLegacy";
import { OG_DEFAULT_IMAGE, SITE } from "@/lib/site";
import type { Media, Novosti } from "@/payload-types";

// Только рантайм: записи ленты живут в БД, а CI собирает с пустой базой.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

const picture = (v: number | Media | null | undefined, alt: string) =>
  !v || typeof v === "number" || !v.filename
    ? null
    : { src: mediaUrl(v.id, v.filename), alt: v.alt || alt, width: v.width ?? 1200, height: v.height ?? 800 };

const gallery = (doc: Novosti) =>
  (doc.images ?? [])
    .map((row) => picture(row.image, doc.title))
    .filter((p): p is NonNullable<ReturnType<typeof picture>> => p !== null);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const doc = await getNovost(slugFromParam((await params).slug));
  if (!doc) return {};
  const description = doc.excerpt?.trim() || `${doc.title} — новости Малмыжского ремзавода.`;
  const cover = picture(doc.cover, doc.title);
  const url = novostHref(doc);
  return {
    title: doc.title,
    description,
    alternates: { canonical: url },
    // openGraph собираем ЦЕЛИКОМ: в Next этот объект НЕ сливается с
    // родительским глубже верхнего уровня — частичный стёр бы теги из layout.
    openGraph: {
      type: "article",
      locale: "ru_RU",
      siteName: SITE.shortName,
      title: doc.title,
      description,
      url,
      publishedTime: doc.publishedAt ?? undefined,
      images: [cover?.src || OG_DEFAULT_IMAGE],
    },
  };
}

export default async function NovostPage({ params }: Props) {
  const doc = await getNovost(slugFromParam((await params).slug));
  if (!doc) notFound();

  const cover = picture(doc.cover, doc.title);
  const images = gallery(doc);
  // Обложка почти всегда есть и в галерее — второй раз её не показываем.
  const rest = images.filter((i) => i.src !== cover?.src);
  const rubrika = doc.rubrika && typeof doc.rubrika !== "number" ? doc.rubrika.name : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Главная", item: `${SITE.url}/` },
          { "@type": "ListItem", position: 2, name: "Новости", item: `${SITE.url}/novosti/` },
          { "@type": "ListItem", position: 3, name: doc.title, item: SITE.url + novostHref(doc) },
        ],
      },
      {
        "@type": "NewsArticle",
        headline: doc.title,
        datePublished: doc.publishedAt,
        dateModified: doc.updatedAt,
        inLanguage: "ru",
        author: { "@type": "Organization", name: SITE.name },
        publisher: { "@type": "Organization", name: SITE.name },
        mainEntityOfPage: SITE.url + novostHref(doc),
        ...(cover ? { image: SITE.url + cover.src } : {}),
      },
    ],
  };

  return (
    <article className="mx-auto max-w-3xl px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav aria-label="Хлебные крошки" className="mb-4 text-sm text-neutral-500">
        <Link href="/" className="hover:text-[var(--accent)]">
          Главная
        </Link>
        {" / "}
        <Link href="/novosti/" className="hover:text-[var(--accent)]">
          Новости
        </Link>
      </nav>

      <h1 className="text-3xl font-bold text-[var(--accent)]">{doc.title}</h1>
      <p className="mt-2 text-sm text-neutral-500">
        {doc.publishedAt &&
          new Date(doc.publishedAt).toLocaleDateString("ru-RU", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        {rubrika && (
          <span className="ml-2 rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">{rubrika}</span>
        )}
      </p>

      {cover && (
        <Image
          src={cover.src}
          alt={cover.alt}
          width={cover.width}
          height={cover.height}
          sizes="(max-width: 768px) 100vw, 768px"
          className="mt-6 w-full rounded object-cover"
          priority
        />
      )}

      {/* Текст поста хранится как обычный текст с переносами: разметки у поста
          ВКонтакте нет, а абзацы есть — рендерим их абзацами, а не <pre>. */}
      <div className="prose-rmz mt-6 space-y-4">
        {(doc.body ?? "")
          .split(/\n{2,}/)
          .map((para) => para.trim())
          .filter(Boolean)
          .map((para, i) => (
            <p key={i} className="whitespace-pre-line">
              {para}
            </p>
          ))}
      </div>

      {rest.length > 0 && (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {rest.map((img) => (
            <Image
              key={img.src}
              src={img.src}
              alt={img.alt}
              width={img.width}
              height={img.height}
              sizes="(max-width: 640px) 50vw, 240px"
              className="h-40 w-full rounded object-cover"
            />
          ))}
        </div>
      )}

      {doc.vkUrl && (
        <p className="mt-8 text-sm text-neutral-500">
          Оригинал записи:{" "}
          <a href={doc.vkUrl} rel="noopener nofollow" target="_blank" className="underline hover:text-[var(--accent)]">
            сообщество ВКонтакте
          </a>
        </p>
      )}

      <p className="mt-10">
        <Link href="/novosti/" className="font-semibold hover:text-[var(--accent)]">
          ← Все новости
        </Link>
      </p>
    </article>
  );
}
