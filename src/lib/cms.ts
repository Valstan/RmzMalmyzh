import config from '@payload-config'
import { getPayload } from 'payload'
import { cache } from 'react'

import type { Faq, Page } from '@/payload-types'

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
