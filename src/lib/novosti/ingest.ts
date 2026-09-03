import { timingSafeEqual } from 'crypto'

/**
 * Чистая логика ленты новостей из VK: разбор ответа `wall.get`, чистка разметки,
 * заголовок/аннотация из текста, выбор картинок. Ни БД, ни HTTP — поэтому это
 * проверяется числами на фикстурах (`scripts/novosti-ingest.test.mjs`, идея #098:
 * локального стенда у проекта нет, каждый прогон CI стоит минуты).
 *
 * Сайт в VK не ходит: посты приходят через шлюз SARAFAN (`POST /api/gateway/call`,
 * `{method:'wall.get', params:{owner_id, count, offset}}` → `{ok, response:{count, items}}`).
 * Форма `items` — сырой VK API, поэтому разбор здесь терпим к отсутствию полей.
 */

/** owner_id сообщества vk.ru/rmz43 — со знаком минус, как требует VK API. */
export const RMZ_OWNER_ID = -195583920

export const MAX_IMAGES_PER_POST = 10
export const TITLE_MAX = 80
export const EXCERPT_MAX = 200

export type VkPhotoSize = { type?: string; url?: string; width?: number; height?: number }
export type VkAttachment = {
  type?: string
  photo?: { id?: number; owner_id?: number; sizes?: VkPhotoSize[] }
}
export type VkWallItem = {
  id?: number
  owner_id?: number
  from_id?: number
  date?: number
  text?: string
  attachments?: VkAttachment[]
  copy_history?: VkWallItem[]
  marked_as_ads?: number | boolean
  is_pinned?: number | boolean
  post_type?: string
}

export type NormalizedPost = {
  vkPostId: string
  vkUrl: string
  title: string
  excerpt: string
  body: string
  publishedAt: string
  /** URL самых крупных вариантов фото, по одному на вложение, до MAX_IMAGES_PER_POST. */
  images: string[]
  /** Репост чужой записи: текст и картинки взяты из copy_history. */
  repost: boolean
}

export type SkippedPost = { vkPostId: string; reason: 'ads' | 'empty' | 'malformed' }

/**
 * Разметка VK в тексте поста: `[club123|Название]` и `[id123|Имя]` → «Название»,
 * `#хештег@club` → `#хештег`, три и больше пустых строк → одна пустая строка.
 * Ссылки и эмодзи не трогаем — это часть текста, а не разметка.
 */
export const cleanVkText = (raw: string): string =>
  raw
    .replace(/\r\n?/g, '\n')
    .replace(/\[(?:club|public|id|event)\d+\|([^\]]+)\]/g, '$1')
    .replace(/(#[\p{L}\p{N}_]+)@[\p{L}\p{N}_]+/gu, '$1')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

const cutAtWord = (text: string, max: number): string => {
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > max / 2 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:—–-]+$/g, '')}…`
}

/** Заголовок — первая непустая строка, обрезанная по слову; хештеги в начале строки не считаются заголовком. */
export const titleFromText = (text: string): string => {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  const first = (lines.find((l) => !/^#/.test(l)) ?? lines[0] ?? '').replace(/^[\s\p{P}]+/u, '').trim()
  // Первое предложение, если оно умещается: «Требуется токарь. Оплата сдельная…» →
  // «Требуется токарь.» — иначе заголовком стал бы обрубок длинного абзаца.
  const sentence = first.match(/^(.{8,}?[.!?…])(?:\s|$)/u)?.[1]
  if (sentence && sentence.length <= TITLE_MAX) return sentence
  return cutAtWord(first, TITLE_MAX)
}

/** Аннотация для карточки — начало текста без переносов, обрезанное по слову. */
export const excerptFromText = (text: string): string =>
  cutAtWord(text.replace(/\s+/g, ' ').trim(), EXCERPT_MAX)

/** Самый крупный вариант фото по площади; у VK ещё есть буквенные типы, но площадь надёжнее. */
export const largestPhotoUrl = (sizes: VkPhotoSize[] | undefined): string | undefined => {
  let best: VkPhotoSize | undefined
  for (const s of sizes ?? []) {
    if (!s?.url || !/^https?:\/\//i.test(s.url)) continue
    const area = (s.width ?? 0) * (s.height ?? 0)
    if (!best || area > (best.width ?? 0) * (best.height ?? 0)) best = s
  }
  return best?.url
}

const photosOf = (item: VkWallItem): string[] => {
  const urls: string[] = []
  for (const a of item.attachments ?? []) {
    if (a?.type !== 'photo') continue
    const url = largestPhotoUrl(a.photo?.sizes)
    if (url && !urls.includes(url)) urls.push(url)
    if (urls.length >= MAX_IMAGES_PER_POST) break
  }
  return urls
}

const isTruthy = (v: number | boolean | undefined): boolean => v === true || v === 1

/**
 * Один элемент `wall.get` → пост ленты или причина пропуска.
 *
 * Реклама (`marked_as_ads`) пропускается: на сайте завода ей не место. Репост
 * без собственного текста берёт текст и фото из `copy_history[0]` — иначе в ленте
 * была бы пустая карточка. Пост без текста и без фото пропускается как пустой.
 */
export const normalizeWallItem = (
  item: VkWallItem,
  ownerId: number = RMZ_OWNER_ID,
): { post: NormalizedPost } | { skipped: SkippedPost } => {
  const owner = typeof item.owner_id === 'number' ? item.owner_id : ownerId
  if (typeof item.id !== 'number' || !Number.isFinite(item.id)) {
    return { skipped: { vkPostId: `${owner}_?`, reason: 'malformed' } }
  }
  const vkPostId = `${owner}_${item.id}`
  if (isTruthy(item.marked_as_ads)) return { skipped: { vkPostId, reason: 'ads' } }

  let text = cleanVkText(typeof item.text === 'string' ? item.text : '')
  let images = photosOf(item)
  let repost = false
  const copied = item.copy_history?.[0]
  if (copied && !text && images.length === 0) {
    text = cleanVkText(typeof copied.text === 'string' ? copied.text : '')
    images = photosOf(copied)
    repost = true
  }
  if (!text && images.length === 0) return { skipped: { vkPostId, reason: 'empty' } }

  const date = typeof item.date === 'number' && item.date > 0 ? item.date : 0
  const publishedAt = new Date((date || Math.floor(Date.now() / 1000)) * 1000).toISOString()
  const title = titleFromText(text) || `Фото от ${publishedAt.slice(0, 10)}`

  return {
    post: {
      vkPostId,
      vkUrl: `https://vk.com/wall${vkPostId}`,
      title,
      excerpt: excerptFromText(text),
      body: text,
      publishedAt,
      images,
      repost,
    },
  }
}

export type NormalizeResult = { posts: NormalizedPost[]; skipped: SkippedPost[] }

export const normalizeWall = (items: unknown, ownerId: number = RMZ_OWNER_ID): NormalizeResult => {
  const posts: NormalizedPost[] = []
  const skipped: SkippedPost[] = []
  if (!Array.isArray(items)) return { posts, skipped }
  for (const raw of items) {
    if (!raw || typeof raw !== 'object') {
      skipped.push({ vkPostId: '?', reason: 'malformed' })
      continue
    }
    const r = normalizeWallItem(raw as VkWallItem, ownerId)
    if ('post' in r) posts.push(r.post)
    else skipped.push(r.skipped)
  }
  return { posts, skipped }
}

const TRANSLIT: Readonly<Record<string, string>> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i',
  й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
  у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '',
  э: 'e', ю: 'yu', я: 'ya',
}

/**
 * Кириллица → латиница для адресов.
 *
 * Все 128 адресов сайта латинские (WordPress транслитерировал их при переносе),
 * и лента не должна выбиваться. Дело не в красоте: не-ASCII в пути живёт в URL
 * только percent-encoded, а значит попадает в таком виде в sitemap, в отчёты
 * Метрики и в любую строку, которую собирает код. Заголовок HTTP не принимает
 * не-ASCII вовсе — `res.setHeader('location', '/новости/…')` бросает
 * ERR_INVALID_CHAR, то есть редирект на такой адрес отдал бы 500 вместо перехода.
 */
export const translit = (s: string): string =>
  [...s.toLowerCase()].map((ch) => TRANSLIT[ch] ?? ch).join('')

/** Slug поста: из заголовка плюс номер поста — заголовки в ленте повторяются («С праздником!»). */
export const slugFor = (post: NormalizedPost): string => {
  const base = translit(post.title)
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]+/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 70)
    .replace(/-$/, '')
  const num = post.vkPostId.split('_')[1] ?? ''
  return `${base || 'post'}-${num}`
}

/** Constant-time сравнение секрета из заголовка с ожидаемым. */
export const secretMatches = (given: string, expected: string | undefined): boolean => {
  if (!expected) return false
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

/** Тело запроса `POST /api/ingest/novosti` — две формы, обе описаны в роуте. */
export type IngestRequest =
  | { source: 'items'; items: unknown[]; ownerId?: number }
  | { source: 'gateway'; count?: number; offset?: number }

export const parseIngestRequest = (body: Record<string, unknown>): IngestRequest | { error: string } => {
  if (body.source === 'items') {
    if (!Array.isArray(body.items)) return { error: 'items must be an array' }
    if (body.items.length > 100) return { error: 'items: at most 100 per request' }
    const ownerId = typeof body.ownerId === 'number' ? body.ownerId : undefined
    return { source: 'items', items: body.items, ownerId }
  }
  if (body.source === 'gateway') {
    const count = typeof body.count === 'number' ? Math.min(Math.max(1, Math.floor(body.count)), 100) : 20
    const offset = typeof body.offset === 'number' ? Math.max(0, Math.floor(body.offset)) : 0
    return { source: 'gateway', count, offset }
  }
  return { error: 'source must be "items" or "gateway"' }
}
