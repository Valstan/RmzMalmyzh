import config from '@payload-config'
import { getPayload } from 'payload'

import { readJsonBody } from '@/lib/requestBody'
import { SITE } from '@/lib/site'

/**
 * Бэкенд форм (замена mailto стадии 1). Заявка пишется в коллекцию zayavki;
 * при настроенном SMTP дубль уходит письмом в отдел сбыта.
 *
 * Антиспам: honeypot-поле (website) + Яндекс SmartCaptcha, когда заданы ключи
 * (SMARTCAPTCHA_SERVER_KEY на сервере, NEXT_PUBLIC_SMARTCAPTCHA_KEY на клиенте).
 * Без ключей форма работает без капчи — деградация осознанная (owner-gate:
 * ключи выдаёт владелец, аудит: reCAPTCHA из РФ не работает → SmartCaptcha).
 */

const bad = (status: number, error: string) =>
  Response.json({ ok: false, error }, { status })

async function checkSmartCaptcha(token: string | undefined, ip: string): Promise<boolean> {
  const serverKey = process.env.SMARTCAPTCHA_SERVER_KEY
  if (!serverKey) return true
  if (!token) return false
  try {
    const res = await fetch('https://smartcaptcha.yandexcloud.net/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: serverKey, token, ip }),
    })
    if (!res.ok) return false
    const data = (await res.json()) as { status?: string }
    return data.status === 'ok'
  } catch {
    return false
  }
}

export async function POST(req: Request) {
  // Потолок держится ДО разбора тела: капча проверяется позже и от заливки
  // мегабайтов не защищает, а процесс делит 512 МБ со всем сайтом.
  const read = await readJsonBody(req)
  if (!read.ok) return bad(read.error === 'too_large' ? 413 : 400, read.error)
  const body = read.body

  // Honeypot: у людей поле скрыто и пусто; бот его заполняет.
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return Response.json({ ok: true })
  }

  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 200) : ''
  const contact = typeof body.contact === 'string' ? body.contact.trim().slice(0, 200) : ''
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, 5000) : ''
  const subject = typeof body.subject === 'string' ? body.subject.trim().slice(0, 300) : 'Заявка с сайта'
  if (!name || !contact) return bad(400, 'missing_fields')

  const ip = req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for')?.split(',')[0] || ''
  const token = typeof body.smartToken === 'string' ? body.smartToken : undefined
  if (!(await checkSmartCaptcha(token, ip))) return bad(403, 'captcha')

  const payload = await getPayload({ config })
  await payload.create({
    collection: 'zayavki',
    data: { name, contact, message, subject },
    overrideAccess: true,
  })

  // Дубль письмом в отдел сбыта: не валим заявку, если SMTP хромает —
  // она уже сохранена в админке.
  try {
    await payload.sendEmail({
      to: SITE.emails.sales,
      subject,
      text: `Имя: ${name}\nКонтакт: ${contact}\n\n${message}\n\n— ${subject}, ${SITE.url}`,
    })
  } catch (e) {
    payload.logger.error(`[zayavka] email не ушёл: ${String(e)}`)
  }

  return Response.json({ ok: true })
}
