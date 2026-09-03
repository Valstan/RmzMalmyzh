import config from '@payload-config'
import { getPayload } from 'payload'

import {
  MAX_IMAGES_PER_POST,
  normalizeWall,
  parseIngestRequest,
  RMZ_OWNER_ID,
  secretMatches,
  slugFor,
  type NormalizedPost,
  type SkippedPost,
} from '@/lib/novosti/ingest'
import { readJsonBody } from '@/lib/requestBody'

/**
 * Приёмник ленты новостей из VK (заказ владельца 2026-08-23).
 *
 * Контракт: `POST /api/ingest/novosti/`, заголовок `X-Ingest-Key` (значение —
 * `NOVOSTI_INGEST_KEY` из env прода; без него роут отвечает 503, с неверным — 401).
 * Тело — одна из двух форм:
 *
 *   { "source": "items", "items": [<сырые элементы wall.get>], "ownerId"?: -195583920 }
 *   { "source": "gateway", "count"?: 20, "offset"?: 0 }
 *
 * Первая — для CI-гейта и ручной доставки (фикстуры), вторая — боевой режим: роут
 * сам ходит в шлюз SARAFAN (`SARAFAN_GATEWAY_URL` + `SARAFAN_GATEWAY_KEY` из env)
 * и забирает стену `VK_RMZ_OWNER_ID`. Почему ходит сайт, а не раннер GitHub: с
 * раннера хост шлюза недоступен (таймаут, run 33680848596), а бокс и Сетка у одного
 * хостера. Запускает боевой режим воркфлоу `import-novosti.yml` — через ssh на бокс
 * и curl в localhost, ключ при этом не покидает бокса.
 *
 * Поведение:
 * - каждый пост приезжает ЧЕРНОВИКОМ (`_status: 'draft'`) — публикует редактор;
 * - идемпотентность по `vkPostId` **до** скачивания картинок (G224): уже привезённый
 *   пост — черновик или опубликованный — не трогается вовсе, редакторская правка
 *   важнее свежей копии из VK;
 * - картинки перекладываются в `media` (ссылки на VK CDN протухают, хотлинк не
 *   собирается — см. Novosti.ts); первая крупная — обложка;
 * - рубрика не ставится (см. Rubriki.ts);
 * - реклама и пустые посты пропускаются с причиной в ответе.
 *
 * ⚠️ G223: при `versions.drafts` состояние берётся из `_status` в data.
 */

const MAX_INGEST_BODY = 1024 * 1024
const IMAGE_TIMEOUT_MS = 20_000
const MAX_IMAGE_BYTES = 15 * 1024 * 1024

const bad = (status: number, error: string) => Response.json({ ok: false, error }, { status })

const extOf = (mime: string): string =>
  ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' })[mime] ?? 'jpg'

async function fetchWallFromGateway(count: number, offset: number): Promise<unknown[]> {
  const url = process.env.SARAFAN_GATEWAY_URL
  const key = process.env.SARAFAN_GATEWAY_KEY
  if (!url || !key) throw new Error('gateway is not configured (SARAFAN_GATEWAY_URL/KEY)')
  const ownerId = Number(process.env.VK_RMZ_OWNER_ID) || RMZ_OWNER_ID
  const res = await fetch(`${url.replace(/\/$/, '')}/api/gateway/call`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': key },
    body: JSON.stringify({ method: 'wall.get', params: { owner_id: ownerId, count, offset } }),
    signal: AbortSignal.timeout(60_000),
  })
  if (!res.ok) throw new Error(`gateway HTTP ${res.status}`)
  const data = (await res.json()) as { ok?: boolean; response?: { items?: unknown[] }; error?: unknown }
  if (!data.ok) throw new Error(`gateway error: ${JSON.stringify(data.error ?? data)}`)
  return Array.isArray(data.response?.items) ? data.response.items : []
}

async function downloadImage(
  src: string,
): Promise<{ data: Buffer; mimetype: string } | { error: string }> {
  try {
    const res = await fetch(src, { signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS) })
    if (!res.ok) return { error: `HTTP ${res.status}` }
    const mimetype = (res.headers.get('content-type') ?? '').split(';')[0].trim()
    if (!mimetype.startsWith('image/')) return { error: `not an image: ${mimetype || 'no content-type'}` }
    const declared = Number(res.headers.get('content-length'))
    if (Number.isFinite(declared) && declared > MAX_IMAGE_BYTES) return { error: 'too large' }
    const data = Buffer.from(await res.arrayBuffer())
    if (data.byteLength > MAX_IMAGE_BYTES) return { error: 'too large' }
    if (data.byteLength === 0) return { error: 'empty body' }
    return { data, mimetype }
  } catch (e) {
    return { error: String(e instanceof Error ? e.message : e) }
  }
}

type Payload = Awaited<ReturnType<typeof getPayload>>

async function importPost(
  payload: Payload,
  post: NormalizedPost,
  warnings: string[],
): Promise<'created' | 'exists'> {
  // Идемпотентность — ДО картинок (G224). draft: true, чтобы видеть и черновики.
  const existing = await payload.find({
    collection: 'novosti',
    where: { vkPostId: { equals: post.vkPostId } },
    draft: true,
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  if (existing.docs[0]) return 'exists'

  const mediaIds: number[] = []
  for (const [i, src] of post.images.slice(0, MAX_IMAGES_PER_POST).entries()) {
    const got = await downloadImage(src)
    if ('error' in got) {
      warnings.push(`${post.vkPostId} image ${i}: ${got.error}`)
      continue
    }
    const name = `vk${post.vkPostId}-${i + 1}.${extOf(got.mimetype)}`
    try {
      const doc = await payload.create({
        collection: 'media',
        data: { alt: post.title },
        file: { name, data: got.data, mimetype: got.mimetype, size: got.data.byteLength },
        overrideAccess: true,
      })
      mediaIds.push(doc.id)
    } catch (e) {
      warnings.push(`${post.vkPostId} image ${i}: media create failed: ${String(e)}`)
    }
  }

  await payload.create({
    collection: 'novosti',
    draft: true,
    data: {
      _status: 'draft',
      title: post.title,
      slug: slugFor(post),
      publishedAt: post.publishedAt,
      excerpt: post.excerpt,
      body: post.body,
      source: 'vk',
      vkPostId: post.vkPostId,
      vkUrl: post.vkUrl,
      cover: mediaIds[0],
      images: mediaIds.map((id) => ({ image: id })),
    },
    overrideAccess: true,
  })
  return 'created'
}

export async function POST(req: Request) {
  const expected = process.env.NOVOSTI_INGEST_KEY
  if (!expected) return bad(503, 'ingest_not_configured')
  if (!secretMatches(req.headers.get('x-ingest-key') ?? '', expected)) return bad(401, 'unauthorized')

  const read = await readJsonBody(req, MAX_INGEST_BODY)
  if (!read.ok) return bad(read.error === 'too_large' ? 413 : 400, read.error)
  const parsed = parseIngestRequest(read.body)
  if ('error' in parsed) return bad(400, parsed.error)

  let items: unknown[]
  let ownerId = RMZ_OWNER_ID
  if (parsed.source === 'items') {
    items = parsed.items
    ownerId = parsed.ownerId ?? RMZ_OWNER_ID
  } else {
    try {
      items = await fetchWallFromGateway(parsed.count ?? 20, parsed.offset ?? 0)
    } catch (e) {
      return Response.json(
        { ok: false, error: 'gateway_failed', detail: String(e instanceof Error ? e.message : e) },
        { status: 502 },
      )
    }
  }

  const { posts, skipped } = normalizeWall(items, ownerId)
  const payload = await getPayload({ config })
  const warnings: string[] = []
  const created: string[] = []
  const exists: string[] = []
  const failed: SkippedPost[] = []

  for (const post of posts) {
    try {
      const r = await importPost(payload, post, warnings)
      ;(r === 'created' ? created : exists).push(post.vkPostId)
    } catch (e) {
      payload.logger.error(`[ingest/novosti] ${post.vkPostId}: ${String(e)}`)
      failed.push({ vkPostId: post.vkPostId, reason: 'malformed' })
    }
  }

  return Response.json({
    ok: failed.length === 0,
    received: Array.isArray(items) ? items.length : 0,
    created,
    exists,
    skipped,
    failed,
    warnings,
  })
}
