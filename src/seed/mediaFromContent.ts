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
import {
  IMG_TAG_RE,
  LEGACY_IMG_RE,
  MEDIA_URL_RE,
  legacyPathToFilename,
  mediaUrl,
} from '../lib/mediaLegacy'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const APPLY = process.env.APPLY === '1'

/**
 * Фазы нужны для прода: файлы медиа пишутся туда, где запущен скрипт, а на боксе
 * MEDIA_DIR свой. Если импорт и перевод ссылок идут одним проходом, между записью
 * ссылок и доставкой файлов на бокс есть окно, когда страницы ссылаются на ещё
 * не приехавший файл. Поэтому на проде: `media` → доставка файлов → `links`.
 * Локально и в CI фаза `both` (по умолчанию).
 *
 * Если запись есть, а файла в MEDIA_DIR нет (доставка упала), прогон осознанно
 * падает: перезалить файл в ту же запись нельзя — Payload считает её собственное
 * имя занятым и добавляет суффикс, из-за чего поиск по детерминированному имени
 * перестаёт работать. Единственный путь восстановления — `PHASE=reset` (снос
 * импортных wp-записей, отказывает, если контент уже переведён) и чистый повтор.
 */
const PHASE = (process.env.PHASE || 'both') as 'media' | 'links' | 'both' | 'reset'
if (!['media', 'links', 'both', 'reset'].includes(PHASE)) {
  console.error(`неизвестная PHASE=${PHASE}; ожидается media | links | both | reset`)
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

// 2a. PHASE=reset — откат половинчатого импорта: снести wp-записи и начать заново.
//     Защита делает фазу безопасной навсегда: как только контент переведён на
//     /media/, снос записей ломал бы живые ссылки, и reset отказывается работать.
if (PHASE === 'reset') {
  // Свежий RegExp на каждую страницу: у MEDIA_URL_RE флаг `g`, а .test() на
  // глобальном регэкспе тащит lastIndex между вызовами и пропускал бы страницы.
  const referencing = pages.filter(
    (p) => typeof p.html === 'string' && new RegExp(MEDIA_URL_RE.source).test(p.html),
  ).length
  if (referencing > 0) {
    log(`❌ отказ: ${referencing} страниц уже ссылаются на /media/ — снос записей сломал бы их.`)
    log('   Если нужен откат уже переведённого контента — восстанавливайте pg_dump.')
    process.exit(1)
  }

  const { docs: all } = await payload.find({ collection: 'media', pagination: false, depth: 0 })
  const wp = all.filter((d) => typeof d.filename === 'string' && d.filename.startsWith('wp-'))
  log(`записей media всего: ${all.length}, из них импортных (wp-): ${wp.length}`)
  if (!APPLY) {
    log('\nничего не удалено (dry-run). Повторить с APPLY=1.')
    process.exit(0)
  }
  for (const d of wp) await payload.delete({ collection: 'media', id: d.id })
  log(`✅ удалено ${wp.length} импортных записей; можно прогонять media заново`)
  process.exit(0)
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
/** Записи без файла на диске — состояние, из которого выход только через reset. */
const broken: string[] = []

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
    // (на боксе нет rsync), staging раннера умер вместе с job.
    //
    // Починить перезаливкой в ту же запись нельзя: Payload считает собственное имя
    // документа занятым и даёт файлу суффикс («…-110x80.jpg» → «…-110x80-1.jpg»,
    // прогон 30353695657). Имя перестаёт совпадать с детерминированным, и поиск
    // записи — линчпин всей идемпотентности — промахивается. Поэтому один честный
    // путь восстановления: PHASE=reset и чистый повтор.
    const onDisk = path.join(MEDIA_STATIC_DIR, path.basename(existing.filename))
    if (!fs.existsSync(onDisk)) {
      broken.push(`${legacy} → запись ${existing.id} (${existing.filename}), файла нет в MEDIA_DIR`)
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

log(`media: ${APPLY ? 'создано' : 'к созданию'} ${created}, переиспользовано ${reused}`)

if (broken.length > 0) {
  log(`\n❌ записей без файла в MEDIA_DIR: ${broken.length}`)
  for (const b of broken.slice(0, 5)) log(`  ${b}`)
  if (broken.length > 5) log(`  … и ещё ${broken.length - 5}`)
  log(
    '\nЭто половинчатое состояние (записи есть, файлы не доехали).\n' +
      'Лечение: PHASE=reset APPLY=1 — снесёт wp-записи (он откажется, если контент\n' +
      'уже ссылается на /media/), затем обычный прогон media → доставка → links.',
  )
  process.exit(1)
}
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
