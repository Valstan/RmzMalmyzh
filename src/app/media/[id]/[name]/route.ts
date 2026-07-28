/**
 * Выдача файла медиа по НОМЕРУ записи: `/media/<id>/<имя-файла>`.
 *
 * Зачем свой роут, если Payload и так отдаёт `/api/media/file/<filename>`:
 * контент 128 страниц ссылается на картинки 521 раз, а при замене файла в
 * админке Payload меняет `filename` на имя нового файла — все ссылки по имени
 * разом отвалились бы. Номер записи не меняется никогда, поэтому редактор
 * может залить файл с любым именем и ничего не сломать (аудит §4.2).
 *
 * Имя в хвосте URL — косметика (читаемые логи, осмысленное «сохранить как»),
 * на выдачу не влияет: источник правды — сам документ.
 */
import fs from 'fs/promises'
import path from 'path'

import config from '@payload-config'
import { getPayload } from 'payload'

import { MEDIA_STATIC_DIR } from '@/collections/Media'

// Роут читает БД в рантайме — прекомпиляция на сборке недопустима: CI собирает
// с эфемерной (а то и пустой) базой.
export const dynamic = 'force-dynamic'

export async function GET(req: Request, { params }: { params: Promise<{ id: string; name: string }> }) {
  const { id } = await params
  if (!/^\d+$/.test(id)) return new Response('Not found', { status: 404 })

  const payload = await getPayload({ config })

  let doc
  try {
    doc = await payload.findByID({ collection: 'media', id, depth: 0, disableErrors: true })
  } catch {
    return new Response('Not found', { status: 404 })
  }
  if (!doc?.filename) return new Response('Not found', { status: 404 })

  // Имя из документа, не из URL — путь наружу не выходит за MEDIA_STATIC_DIR.
  const safeName = path.basename(doc.filename)
  const file = path.join(MEDIA_STATIC_DIR, safeName)

  let body: Buffer
  try {
    body = await fs.readFile(file)
  } catch {
    payload.logger.error(`media ${id}: файла нет на диске — ${file}`)
    return new Response('Not found', { status: 404 })
  }

  // Ссылка стабильна, а содержимое изменяемо → короткий кэш + ETag на ревалидацию:
  // после замены файла в админке картинка обновляется у посетителей за ~5 минут.
  const etag = `"${doc.updatedAt}-${doc.filesize ?? body.length}"`
  if (req.headers.get('if-none-match') === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } })
  }

  return new Response(new Uint8Array(body), {
    headers: {
      'Content-Type': doc.mimeType || 'application/octet-stream',
      'Content-Length': String(body.length),
      'Cache-Control': 'public, max-age=300, must-revalidate',
      ETag: etag,
    },
  })
}
