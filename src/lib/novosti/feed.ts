import type { Novosti, Page } from '@/payload-types'

// Расширения в этих трёх импортах — не стиль, а условие: файл подключается из
// тестов (`pnpm test`), которые Node исполняет как ESM со снятием типов, а ESM
// требует полного специфаера. Отсюда же `allowImportingTsExtensions` в tsconfig.
import { mediaUrl } from '../mediaLegacy.ts'
import { excerptFromText } from './ingest.ts'
import { htmlToPlainText } from './legacy.ts'

/**
 * Лента `/novosti/` собирается из ДВУХ источников и приводит их к одной карточке.
 *
 * Первый — коллекция `novosti`: посты из сообщества ВКонтакте и новости, которые
 * редактор пишет руками. Второй — заводская хроника 2020–2026, которая живёт
 * страницами стадии 1 (`pages` с галкой «Техстатья») и остаётся на своих
 * адресах: см. `legacy.ts`, почему их не переносим и не редиректим.
 *
 * Отсюда `origin`: у записи ленты есть ссылка на оригинал ВКонтакте и своя
 * страница `/novosti/<slug>/`, у архивной — только её исторический адрес.
 */
export type FeedItem = {
  /** Ключ для React: адреса уникальны в обоих источниках. */
  key: string
  href: string
  title: string
  /** ISO-строка; пустая, если даты нет — такие записи в ленту не берём. */
  publishedAt: string
  excerpt: string
  cover: { src: string; alt: string } | null
  rubrika: string | null
  origin: 'lenta' | 'arhiv'
}

/** Адрес записи ленты. Slug редактор может стереть — тогда работает номер записи. */
export const novostHref = (doc: Pick<Novosti, 'id' | 'slug'>): string =>
  `/novosti/${encodeURIComponent(doc.slug || String(doc.id))}/`

/**
 * Сегмент адреса → slug для поиска в базе.
 *
 * Next отдаёт параметр маршрута уже раскодированным, поэтому декодировать его
 * второй раз нельзя: `decodeURIComponent('скидка-50%')` бросает URIError, и
 * запись со знаком процента в заголовке отдавала бы 500 вместо страницы.
 * Раскодируем только то, что похоже на percent-escape, и молча отступаем, если
 * последовательность битая.
 */
export const slugFromParam = (raw: string): string => {
  if (!/%[0-9a-fA-F]{2}/.test(raw)) return raw
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

const coverOfNovost = (doc: Novosti): FeedItem['cover'] => {
  const c = doc.cover
  if (!c || typeof c === 'number' || !c.filename) return null
  return { src: mediaUrl(c.id, c.filename), alt: c.alt || doc.title }
}

export const feedItemFromNovost = (doc: Novosti): FeedItem => ({
  key: `novost-${doc.id}`,
  href: novostHref(doc),
  title: doc.title,
  publishedAt: doc.publishedAt ?? '',
  excerpt: doc.excerpt?.trim() || excerptFromText(doc.body ?? ''),
  cover: coverOfNovost(doc),
  rubrika: doc.rubrika && typeof doc.rubrika !== 'number' ? doc.rubrika.name : null,
  origin: 'lenta',
})

export const feedItemFromPage = (page: Page): FeedItem => ({
  key: `page-${page.id}`,
  href: page.path,
  title: page.h1,
  publishedAt: page.publishedAt ?? '',
  excerpt: excerptFromText(htmlToPlainText(page.html ?? '')),
  cover: page.ogImage ? { src: page.ogImage, alt: page.h1 } : null,
  rubrika: null,
  origin: 'arhiv',
})

/**
 * Слияние источников: свежее сверху. Записи без даты отбрасываем — в
 * хронологической ленте им негде встать, а сортировка молча ставила бы их
 * в конец, и редактор считал бы, что запись потерялась.
 */
export const mergeFeed = (items: FeedItem[]): FeedItem[] =>
  items
    .filter((i) => i.publishedAt)
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : a.publishedAt > b.publishedAt ? -1 : 0))

export const FEED_PAGE_SIZE = 12

export type FeedPage = {
  items: FeedItem[]
  page: number
  pages: number
  total: number
}

/**
 * Постраничная выдача. Номер страницы приходит из query, то есть из рук
 * посетителя и краулера: любой мусор («0», «-3», «abc», «1e9») обязан давать
 * первую страницу, а не пустой список и не падение.
 */
export const paginate = (all: FeedItem[], rawPage: unknown, size = FEED_PAGE_SIZE): FeedPage => {
  const total = all.length
  const pages = Math.max(1, Math.ceil(total / size))
  const asked = Number.parseInt(typeof rawPage === 'string' ? rawPage : '', 10)
  const page = Number.isFinite(asked) && asked >= 1 ? Math.min(asked, pages) : 1
  return { items: all.slice((page - 1) * size, page * size), page, pages, total }
}
