import type { Metadata } from "next";
import Link from "next/link";

import { getStati } from "@/lib/cms";
import { htmlToPlainText } from "@/lib/novosti/legacy";
import { excerptFromText } from "@/lib/novosti/ingest";
import { SITE } from "@/lib/site";

// Только рантайм: список строится из БД, а CI собирает с пустой базой.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Технические статьи о дизелях Д6",
  description:
    "Устройство, эксплуатация, обслуживание и диагностика дизельных двигателей Д6: картер, КШМ, газораспределение, топливная и масляная системы, охлаждение, пуск, электрооборудование. Материалы Малмыжского ремзавода.",
  alternates: { canonical: "/stati/" },
};

export default async function StatiPage() {
  const stati = await getStati();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Технические статьи о дизелях Д6",
    url: `${SITE.url}/stati/`,
    hasPart: stati.map((p) => ({
      "@type": "TechArticle",
      headline: p.h1,
      url: SITE.url + p.path,
      datePublished: p.publishedAt ?? undefined,
    })),
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-4xl font-bold text-[var(--accent)]">Технические статьи</h1>
        <Link href="/novosti/" className="text-sm font-semibold hover:text-[var(--accent)]">
          Новости завода →
        </Link>
      </div>
      <p className="mb-8 max-w-2xl text-neutral-700">
        Разборы узлов, регламенты обслуживания и диагностика дизелей Д6 — то, что накопил завод за годы
        капитального ремонта. Материалы пишут наши инженеры.
      </p>

      {stati.length === 0 ? (
        <p className="text-neutral-600">Статей пока нет.</p>
      ) : (
        <ul className="space-y-6">
          {stati.map((p) => (
            <li key={p.path} className="rounded bg-white p-6 shadow-sm">
              {p.publishedAt && (
                <p className="text-sm text-neutral-500">
                  {new Date(p.publishedAt).toLocaleDateString("ru-RU", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              )}
              <h2 className="my-1 text-xl font-bold">
                <Link href={p.path} className="hover:text-[var(--accent)]">
                  {p.h1}
                </Link>
              </h2>
              <p className="text-sm text-neutral-700">
                {excerptFromText(htmlToPlainText(p.html ?? ""))}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
