import config from '@payload-config'
import { getPayload } from 'payload'
import { cache } from 'react'

import type { Faq, Novosti, Page } from '@/payload-types'

import { feedItemFromNovost, feedItemFromPage, mergeFeed, type FeedItem } from './novosti/feed'
import { legacyGenre } from './novosti/legacy'

/**
 * Чтение контента из Payload (local API) для фронта. Все страницы — ISR
 * (revalidate в роутах) + on-demand сброс из хуков коллекций (revalidateSite).
 * Тянем только published: черновики видны только в админке.
 */

const db = () => getPayload({ config })

export const getAllPages = cache(async (): Promise<Page[]> => {
  const payload = await db()
  const res = await payload.find({
    collection: 'pages',
    where: { _status: { equals: 'published' } },
    pagination: false,
    limit: 1000,
    sort: 'path',
  })
  return res.docs
})

export const getPage = cache(async (path: string): Promise<Page | null> => {
  const payload = await db()
  const res = await payload.find({
    collection: 'pages',
    where: { and: [{ path: { equals: path } }, { _status: { equals: 'published' } }] },
    limit: 1,
  })
  return res.docs[0] ?? null
})

export const getPosts = cache(async (): Promise<Page[]> => {
  const payload = await db()
  const res = await payload.find({
    collection: 'pages',
    where: {
      and: [
        { isPost: { equals: true } },
        { publishedAt: { exists: true } },
        { _status: { equals: 'published' } },
      ],
    },
    pagination: false,
    limit: 1000,
    sort: '-publishedAt',
  })
  return res.docs
})

/**
 * Технические статьи для `/stati/`. Это те же `isPost`-страницы, что и раньше,
 * минус заводская хроника — она уехала в ленту (список в `novosti/legacy.ts`).
 */
export const getStati = cache(async (): Promise<Page[]> => {
  const posts = await getPosts()
  return posts.filter((p) => legacyGenre(p.path) === 'statya')
})

/**
 * Записи ленты из коллекции `novosti`.
 *
 * ⚠️ Фильтр `_status: published` обязателен и не заменяется access-контролем:
 * локальный API Payload ходит с `overrideAccess: true`, поэтому
 * `authenticatedOrPublished` фронт не защищает. Без этой строки лента, карточка
 * записи и sitemap показывали бы черновики — а весь смысл коллекции в том, что
 * пост из ВКонтакте приезжает черновиком и публикует его редактор.
 *
 * `depth: 1` — нужны сам файл обложки и название рубрики, а не их номера.
 */
export const getNovosti = cache(async (): Promise<Novosti[]> => {
  const payload = await db()
  const res = await payload.find({
    collection: 'novosti',
    pagination: false,
    limit: 1000,
    sort: '-publishedAt',
    depth: 1,
  })
  return res.docs
})

/** Одна запись ленты по slug; цифровой хвост адреса — номер записи (slug редактор может стереть). */
export const getNovost = cache(async (slugOrId: string): Promise<Novosti | null> => {
  const payload = await db()
  const published = { _status: { equals: 'published' } }
  const bySlug = await payload.find({
    collection: 'novosti',
    where: { and: [{ slug: { equals: slugOrId } }, published] },
    limit: 1,
    depth: 1,
  })
  if (bySlug.docs[0]) return bySlug.docs[0]
  if (!/^\d+$/.test(slugOrId)) return null
  const byId = await payload.find({
    collection: 'novosti',
    where: { and: [{ id: { equals: Number(slugOrId) } }, published] },
    limit: 1,
    depth: 1,
  })
  return byId.docs[0] ?? null
})

/** Лента целиком: записи коллекции + заводская хроника со страниц, свежее сверху. */
export const getFeed = cache(async (): Promise<FeedItem[]> => {
  const [novosti, posts] = await Promise.all([getNovosti(), getPosts()])
  const hronika = posts.filter((p) => legacyGenre(p.path) === 'hronika')
  return mergeFeed([...novosti.map(feedItemFromNovost), ...hronika.map(feedItemFromPage)])
})

export const getFaq = cache(async (): Promise<Faq[]> => {
  const payload = await db()
  const res = await payload.find({
    collection: 'faq',
    pagination: false,
    limit: 200,
    sort: 'order',
  })
  return res.docs
})
