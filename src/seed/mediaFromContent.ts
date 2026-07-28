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

import { MEDIA_STATIC_DIR } from '../collections/Media'
import { IMG_TAG_RE, LEGACY_IMG_RE, legacyPathToFilename, mediaUrl } from '../lib/mediaLegacy'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const APPLY = process.env.APPLY === '1'

/**
 * Фазы нужны для прода: файлы медиа пишутся туда, где запущен скрипт, а на боксе
 * MEDIA_DIR свой. Если импорт и перевод ссылок идут одним проходом, между записью
 * ссылок и доставкой файлов на бокс есть окно, когда страницы ссылаются на ещё
 * не приехавший файл. Поэтому на проде: `media` → доставка файлов → `links`.
 * Локально и в CI фаза `both` (по умолчанию).
 *
 * Фаза `media` само-починяющаяся: если запись есть, а файла в MEDIA_DIR нет,
 * файл перезаливается в ТУ ЖЕ запись (id сохраняется). Это делает прогон
 * возобновляемым после сбоя доставки. ⚠️ Работает, пока в контенте ещё есть
 * legacy-ссылки: список работы берётся из них. После завершённой миграции
 * пропавший файл этим скриптом уже не восстановить.
 */
const PHASE = (process.env.PHASE || 'both') as 'media' | 'links' | 'both'
if (!['media', 'links', 'both'].includes(PHASE)) {
  console.error(`неизвестная PHASE=${PHASE}; ожидается media | links | both`)
  process.exit(1)
}

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
}
const mimeOf = (name: string) => MIME[path.extname(name).toLowerCase()] || 'application/octet-stream'

const payload = await getPayload({ config })
const log = (s: string) => console.log(s)

log(
  `=== ФАЗА: ${PHASE} · РЕЖИМ: ${APPLY ? 'применяю изменения' : 'dry-run (ничего не пишу)'} ===`,
)

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
let restored = 0
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
    const existing = { id: docs[0].id, filename: docs[0].filename as string }
    idByPath.set(legacy, existing)

    // Запись есть, а файла в MEDIA_DIR нет — половинчатое состояние. Так вышло
    // на проде 28.07: фаза media записала 180 документов, доставка файлов упала
    // (на боксе нет rsync), staging раннера умер вместе с job. Повторный прогон
    // без этой ветки нашёл бы записи, не создал файлов, и фаза links увела бы
    // ссылки на пустоту. Перезаливаем файл в ТУ ЖЕ запись: id сохраняется (значит
    // ссылки в контенте не ломаются), размеры-превью регенерируются.
    const onDisk = path.join(MEDIA_STATIC_DIR, path.basename(existing.filename))
    if (!fs.existsSync(onDisk)) {
      const src = path.join(root, 'public', legacy)
      if (!fs.existsSync(src)) {
        problems.push(`${legacy} — нет ни файла в MEDIA_DIR, ни исходника ${src}`)
        continue
      }
      if (PHASE === 'links') {
        problems.push(`${legacy} — файла нет в MEDIA_DIR, а фаза links его не восстанавливает`)
        continue
      }
      if (!APPLY) {
        log(`  [dry-run] восстановил бы файл записи ${existing.id}: ${existing.filename}`)
        restored += 1
        continue
      }
      const data = fs.readFileSync(src)
      await payload.update({
        collection: 'media',
        id: existing.id,
        data: {},
        file: { name: existing.filename, data, mimetype: mimeOf(existing.filename), size: data.length },
      })
      restored += 1
      continue
    }

    reused += 1
    continue
  }

  if (PHASE === 'links') {
    // Фаза перевода ссылок идёт после доставки файлов на бокс, значит все записи
    // обязаны существовать. Отсутствие — не «пропустим», а сигнал, что фаза
    // media не доработала: ссылку не трогаем и роняем прогон ниже.
    problems.push(`${legacy} — записи в media нет, а фаза links её не создаёт`)
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

  // Имя задаём ЯВНО через `file`, а не через `filePath`: от filePath Payload
  // взял бы basename (`3d6-350x250.jpg`), и тогда поиск по детерминированному
  // имени на следующем прогоне не нашёл бы запись и наплодил дубли, а две
  // коллизии базовых имён между месяцами разводились бы молчаливым суффиксом «-1».
  const data = fs.readFileSync(filePath)
  const doc = await payload.create({
    collection: 'media',
    data: { alt: alts.get(legacy) || undefined },
    file: { name: filename, data, mimetype: mimeOf(filename), size: data.length },
  })
  idByPath.set(legacy, { id: doc.id, filename: doc.filename as string })
  created += 1
}

log(
  `media: ${APPLY ? 'создано' : 'к созданию'} ${created}, переиспользовано ${reused}, ` +
    `${APPLY ? 'восстановлено файлов' : 'к восстановлению файлов'} ${restored}`,
)
if (!APPLY && created > 0) {
  const examples = [...idByPath.values()].filter((v) => v.id === 0).slice(0, 3)
  log(`  примеры имён: ${examples.map((e) => e.filename).join(', ')}${created > 3 ? ', …' : ''}`)
}
for (const p of problems) log(`  ⚠️ ${p}`)

if (PHASE === 'links' && problems.length > 0) {
  log(`\n❌ фаза links: ${problems.length} путей без записи в media — сначала прогоните PHASE=media`)
  process.exit(1)
}

if (PHASE === 'media') {
  log(
    APPLY
      ? '\n✅ фаза media завершена. Дальше: доставить файлы из MEDIA_DIR на бокс, затем PHASE=links.'
      : '\nничего не записано (dry-run фазы media).',
  )
  process.exit(0)
}

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
