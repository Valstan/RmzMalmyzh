/**
 * Чтение JSON-тела запроса с жёстким потолком по размеру.
 *
 * Зачем не `await req.json()`. У Route Handlers App Router своего лимита на
 * тело нет, а nginx пропускает 25 МБ — этот лимит выставлен ради загрузок
 * файлов в админку и заодно накрывает `/api/`. Процесс сайта живёт под
 * `MemoryMax=512M` и держит ВЕСЬ сайт, а не только формы, поэтому «просто
 * распарсить, что прислали» — способ уронить прод целиком. SmartCaptcha тут не
 * защита по построению: она проверяется уже после разбора тела.
 *
 * Почему поток, а не `Content-Length`. Заголовку доверять нельзя: при
 * `Transfer-Encoding: chunked` его нет вовсе, и проверка «длина в заголовке
 * меньше потолка» пропустила бы сколь угодно большое тело. Поэтому заголовок —
 * только быстрый отказ на честных клиентах, а настоящий потолок держится
 * чтением потока с обрывом: память ограничена сверху фактически.
 *
 * Заодно закрыт край: `req.json()` на теле `null` или `[1,2]` возвращает
 * не-объект, и первое же обращение к полю роняло роут в 500.
 */

/** Тело формы — сотни байт; 64 КБ с огромным запасом покрывают анкету на 40 ответов. */
export const MAX_FORM_BODY = 64 * 1024

export type JsonBody =
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; error: 'too_large' | 'bad_json' }

export async function readJsonBody(req: Request, max: number = MAX_FORM_BODY): Promise<JsonBody> {
  const declared = Number(req.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > max) return { ok: false, error: 'too_large' }

  const reader = req.body?.getReader()
  if (!reader) return { ok: false, error: 'bad_json' }

  const chunks: Uint8Array[] = []
  let total = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      if (!value) continue
      total += value.byteLength
      if (total > max) {
        await reader.cancel()
        return { ok: false, error: 'too_large' }
      }
      chunks.push(value)
    }
  } catch {
    return { ok: false, error: 'bad_json' }
  }

  const merged = new Uint8Array(total)
  let at = 0
  for (const chunk of chunks) {
    merged.set(chunk, at)
    at += chunk.byteLength
  }

  try {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(merged))
    // Массив и null — тоже валидный JSON, но не то, из чего роут читает поля.
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, error: 'bad_json' }
    }
    return { ok: true, body: parsed as Record<string, unknown> }
  } catch {
    return { ok: false, error: 'bad_json' }
  }
}
