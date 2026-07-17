/**
 * Сид стадии 2: переносит контент стадии 1 в Payload.
 *
 *   corepack pnpm payload run src/seed/seedFromStage1.ts
 *
 * Источники: content/pages.json (128 страниц харвеста rmz43.ru, HTML как есть)
 * и src/seed/faqData.ts (FAQ аудита §3.4). Alt-автогенерация картинок (аудит
 * §2.2) применяется к HTML один раз здесь — дальше контент живёт в админке.
 *
 * Идемпотентно: страница по path / вопрос по тексту уже есть → не трогаем
 * (правки в /admin сохраняются); SEED_FORCE=1 перезаписывает осознанно.
 */
import config from '@payload-config'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getPayload } from 'payload'

import { FAQ_SEED } from './faqData'

const dirname = path.dirname(fileURLToPath(import.meta.url))

type PageEntry = {
  slug: string
  title: string
  desc: string | null
  h1: string
  ogImage: string | null
  published: string | null
  isPost: boolean
  html: string
}

/** Аудит §2.2: автогенерация alt для картинок WP (h1 + хвост из имени файла). */
function withAlts(p: PageEntry): string {
  let n = 0
  return p.html.replace(/<img\b[^>]*>/g, (tag) => {
    if (/alt="[^"]/.test(tag)) return tag
    n += 1
    const file = tag.match(/src="[^"]*\/([^/"]+?)(?:-\d+x\d+)?\.\w+"/)?.[1] ?? ''
    const hint = file.replace(/[-_]+/g, ' ').trim()
    const alt = hint ? `${p.h1} — ${hint}` : `${p.h1} — фото ${n}`
    return tag.replace(/\balt=""\s*/, '').replace(/^<img\b/, `<img alt="${alt.replace(/"/g, '')}"`)
  })
}

const run = async () => {
  const payload = await getPayload({ config })
  const force = process.env.SEED_FORCE === '1'

  const pagesPath = path.resolve(dirname, '../../content/pages.json')
  const entries = JSON.parse(fs.readFileSync(pagesPath, 'utf8')) as PageEntry[]

  let created = 0
  let updated = 0
  let skipped = 0
  for (const p of entries) {
    const data = {
      path: p.slug,
      h1: p.h1,
      title: p.title,
      desc: p.desc ?? undefined,
      html: withAlts(p),
      isPost: p.isPost,
      ogImage: p.ogImage ?? undefined,
      publishedAt: p.published ?? undefined,
      _status: 'published' as const,
    }
    const existing = await payload.find({
      collection: 'pages',
      where: { path: { equals: p.slug } },
      limit: 1,
      draft: true,
    })
    if (existing.docs.length === 0) {
      await payload.create({ collection: 'pages', data, context: { disableRevalidate: true } })
      created += 1
    } else if (force) {
      await payload.update({
        collection: 'pages',
        id: existing.docs[0].id,
        data,
        context: { disableRevalidate: true },
      })
      updated += 1
    } else {
      skipped += 1
    }
  }
  console.log(`pages: created=${created} updated=${updated} skipped=${skipped}`)

  let faqCreated = 0
  let faqSkipped = 0
  for (const [i, f] of FAQ_SEED.entries()) {
    const existing = await payload.find({
      collection: 'faq',
      where: { question: { equals: f.q } },
      limit: 1,
    })
    if (existing.docs.length > 0 && !force) {
      faqSkipped += 1
      continue
    }
    const data = { question: f.q, answer: f.a, links: f.links ?? [], order: i }
    if (existing.docs.length > 0) {
      await payload.update({
        collection: 'faq',
        id: existing.docs[0].id,
        data,
        context: { disableRevalidate: true },
      })
    } else {
      await payload.create({ collection: 'faq', data, context: { disableRevalidate: true } })
      faqCreated += 1
    }
  }
  console.log(`faq: created=${faqCreated} skipped=${faqSkipped}`)

  process.exit(0)
}

await run()
