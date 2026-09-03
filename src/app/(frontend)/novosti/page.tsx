import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { getFeed } from "@/lib/cms";
import { FEED_PAGE_SIZE, paginate } from "@/lib/novosti/feed";
import { SITE } from "@/lib/site";

// Только рантайм: CI собирает с пустой БД, поэтому статический пререндер запёк бы
// пустую страницу и отдавал её до первой ревалидации — час после каждого деплоя.
// Вторая причина — ссылки /media/<id>/… привязаны к конкретной базе, так что
// пререндер на сборочной БД был бы не устаревшим, а прямо неверным.
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ page?: string }> };

const pageUrl = (n: number) => (n <= 1 ? "/novosti/" : `/novosti/?page=${n}`);

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { page } = paginate(await getFeed(), (await searchParams).page);
  const suffix = page > 1 ? ` — страница ${page}` : "";
  return {
    title: `Новости${suffix}`,
    description:
      "Новости АО «Малмыжский завод по ремонту дизельных двигателей»: ремонт двигателей, модернизация производства, сотрудничество, жизнь завода.",
    // Каноникал ведёт на саму страницу пагинации, а не на первую: иначе
    // содержимое страниц 2+ объявлено дублем и выпадает из индекса целиком.
    alternates: { canonical: pageUrl(page) },
  };
}

const dateRu = (iso: string) =>
  new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });

export default async function NovostiPage({ searchParams }: Props) {
  const { page: askedPage } = await searchParams;
  const { items, page, pages, total } = paginate(await getFeed(), askedPage);

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Новости Малмыжского ремзавода",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      // Смещение считается от размера страницы, а не от длины текущего куска:
      // на последней странице их числа расходятся, и нумерация поехала бы.
      position: (page - 1) * FEED_PAGE_SIZE + i + 1,
      url: SITE.url + it.href,
      name: it.title,
    })),
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />

      <div className="mb-8 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-4xl font-bold text-[var(--accent)]">Новости</h1>
        {/* Перелинковка двух списков: без неё техстатьи остаются без входа с сайта. */}
        <Link href="/stati/" className="text-sm font-semibold hover:text-[var(--accent)]">
          Технические статьи о дизелях Д6 →
        </Link>
      </div>

      {total === 0 ? (
        <p className="text-neutral-600">Новостей пока нет.</p>
      ) : (
        <div className="space-y-8">
          {items.map((it) => (
            <article key={it.key} className="flex gap-5 rounded bg-white p-6 shadow-sm">
              {it.cover && (
                <Link href={it.href} className="hidden shrink-0 sm:block">
                  <Image
                    src={it.cover.src}
                    alt={it.cover.alt}
                    width={160}
                    height={120}
                    sizes="160px"
                    className="h-28 w-40 rounded object-cover"
                  />
                </Link>
              )}
              <div>
                <p className="text-sm text-neutral-500">
                  {dateRu(it.publishedAt)}
                  {it.rubrika && (
                    <span className="ml-2 rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                      {it.rubrika}
                    </span>
                  )}
                </p>
                <h2 className="my-1 text-xl font-bold">
                  <Link href={it.href} className="hover:text-[var(--accent)]">
                    {it.title}
                  </Link>
                </h2>
                <p className="text-sm text-neutral-700">{it.excerpt}</p>
              </div>
            </article>
          ))}
        </div>
      )}

      {pages > 1 && (
        <nav aria-label="Страницы новостей" className="mt-10 flex items-center justify-between">
          {page > 1 ? (
            <Link href={pageUrl(page - 1)} rel="prev" className="font-semibold hover:text-[var(--accent)]">
              ← Новее
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-neutral-500">
            Страница {page} из {pages}
          </span>
          {page < pages ? (
            <Link href={pageUrl(page + 1)} rel="next" className="font-semibold hover:text-[var(--accent)]">
              Старее →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
