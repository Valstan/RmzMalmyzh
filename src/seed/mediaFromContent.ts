/**
 * Харвест-картинки WP → коллекция `media` + перевод ссылок в контенте (аудит §4.2).
 *
 *   corepack pnpm payload run src/seed/mediaFromContent.ts        # dry-run, ничего не пишет
 *   APPLY=1 corepack pnpm payload run src/seed/mediaFromContent.ts # применить
 *
 * Было: 180 файлов лежат статикой в `public/images/wp/**`, контент 128 страниц
 * ссылается на них 521 раз, в Медиа — ноль записей, заменить картинку из админки
 * нельзя. Стало: каждый файл — запись в `media`, ссылки в контенте ведут на
 * `/media/<id>/<имя>` (стабильный URL, см. `src/app/media/[id]/[name]/route.ts`),
 * редактор меняет файл в админке — картинка обновляется на всех страницах.
 *
 * Идемпотентно и безопасно для повторов:
 *  - запись в `media` ищется по `filename` (детерминированному, см. mediaLegacy) —
 *    второй прогон не плодит дубли;
 *  - после перевода в HTML нет ни одной legacy-ссылки, значит второй прогон
 *    просто не находит работы;
 *  - страницы, где HTML не изменился, не обновляются вовсе (не сбиваем updatedAt).
 *
 * Статику `public/images/wp/**` НЕ удаляем: это исходник импорта и страховка на
 * случай откатa контента из бэкапа.
 */
import config from '@payload-config'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getPayload } from 'payload'

import { IMG_TAG_RE, LEGACY_IMG_RE, legacyPathToFilename, mediaUrl } from '../lib/mediaLegacy'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const APPLY = process.env.APPLY === '1'

const payload = await getPayload({ config })
const log = (s: string) => console.log(s)

log(APPLY ? '=== РЕЖИМ: применяю изменения ===' : '=== РЕЖИМ: dry-run (ничего не пишу) ===')

// 1. Контент как он есть на этой базе — источник правды, а не content/pages.json:
//    правки редактора в админке должны пережить импорт.
const { docs: pages } = await payload.find({
  collection: 'pages',
  pagination: false,
  depth: 0,
})
log(`страниц в базе: ${pages.length}`)

// 2. Сбор legacy-ссылок и alt'ов рядом с ними.
const alts = new Map<string, string>()
const refCount = new Map<string, number>()

const collect = (html: string) => {
  for (const m of html.matchAll(LEGACY_IMG_RE)) {
    refCount.set(m[0], (refCount.get(m[0]) ?? 0) + 1)
  }
  for (const tag of html.matchAll(IMG_TAG_RE)) {
    const src = tag[0].match(/src="([^"]+)"/)?.[1]
    const alt = tag[0].match(/alt="([^"]*)"/)?.[1]
    if (src && alt && !alts.has(src)) alts.set(src, alt)
  }
}

for (const p of pages) {
  if (typeof p.html === 'string') collect(p.html)
  if (typeof p.ogImage === 'string') {
    for (const m of p.ogImage.matchAll(LEGACY_IMG_RE)) {
      refCount.set(m[0], (refCount.get(m[0]) ?? 0) + 1)
    }
  }
}

const legacyPaths = [...refCount.keys()]
const totalRefs = [...refCount.values()].reduce((a, b) => a + b, 0)
log(`legacy-ссылок: ${totalRefs} (уникальных путей ${legacyPaths.length})`)

if (legacyPaths.length === 0) {
  log('✅ переводить нечего — контент уже на media')
  process.exit(0)
}

// 3. Каждому уникальному пути — запись в media (ищем по детерминированному имени).
const idByPath = new Map<string, { id: string | number; filename: string }>()
let created = 0
let reused = 0
const problems: string[] = []

for (const legacy of legacyPaths) {
  const filename = legacyPathToFilename(legacy)
  if (!filename) {
    problems.push(`${legacy} — не разобрал путь, пропускаю`)
    continue
  }

  const { docs } = await payload.find({
    collection: 'media',
    where: { filename: { equals: filename } },
    limit: 1,
    depth: 0,
  })

  if (docs[0]) {
    idByPath.set(legacy, { id: docs[0].id, filename: docs[0].filename as string })
    reused += 1
    continue
  }

  const filePath = path.join(root, 'public', legacy)
  if (!fs.existsSync(filePath)) {
    problems.push(`${legacy} — файла нет на диске (${filePath}), ссылку оставляю как есть`)
    continue
  }

  if (!APPLY) {
    // Настоящего id ещё нет, но подставляем заглушку: тогда отчёт dry-run даёт
    // реальные числа страниц и ссылок — именно по ним принимается решение
    // применять на проде.
    idByPath.set(legacy, { id: 0, filename })
    created += 1
    continue
  }

  const doc = await payload.create({
    collection: 'media',
    data: { alt: alts.get(legacy) || undefined },
    filePath,
  })
  idByPath.set(legacy, { id: doc.id, filename: doc.filename as string })
  created += 1
}

log(`media: ${APPLY ? 'создано' : 'к созданию'} ${created}, переиспользовано ${reused}`)
if (!APPLY && created > 0) {
  const examples = [...idByPath.values()].filter((v) => v.id === 0).slice(0, 3)
  log(`  примеры имён: ${examples.map((e) => e.filename).join(', ')}${created > 3 ? ', …' : ''}`)
}
for (const p of problems) log(`  ⚠️ ${p}`)

// 4. Перевод ссылок. Длинные пути первыми: /…/3d6-350x250.jpg не должен пострадать
//    от замены /…/3d6.jpg (у путей разные расширения, но порядок — дешёвая страховка).
const ordered = [...idByPath.keys()].sort((a, b) => b.length - a.length)
const rewrite = (s: string) => {
  let out = s
  for (const legacy of ordered) {
    const target = idByPath.get(legacy)!
    out = out.split(legacy).join(mediaUrl(target.id, target.filename))
  }
  return out
}

let touched = 0
let rewritten = 0
for (const p of pages) {
  const html = typeof p.html === 'string' ? rewrite(p.html) : p.html
  const ogImage = typeof p.ogImage === 'string' ? rewrite(p.ogImage) : p.ogImage
  const changed = html !== p.html || ogImage !== p.ogImage
  if (!changed) continue
  touched += 1
  const n =
    (typeof p.html === 'string' ? [...p.html.matchAll(LEGACY_IMG_RE)].length : 0) +
    (typeof p.ogImage === 'string' ? [...p.ogImage.matchAll(LEGACY_IMG_RE)].length : 0)
  rewritten += n

  if (!APPLY) {
    log(`  [dry-run] ${p.path}: ${n} ссылок`)
    continue
  }
  await payload.update({
    collection: 'pages',
    id: p.id,
    // У Pages включены черновики: `_status` переносим как есть, чтобы правка
    // ссылок не опубликовала страницу, которую редактор держит в черновике.
    data: { html, ogImage, _status: p._status ?? undefined },
    draft: false,
  })
}

log(`страниц ${APPLY ? 'обновлено' : 'к обновлению'}: ${touched}, ссылок переведено: ${rewritten}`)
if (!APPLY) log('\nничего не записано. Повторить с APPLY=1, чтобы применить.')
process.exit(0)
