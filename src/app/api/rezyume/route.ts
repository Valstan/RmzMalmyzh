import config from '@payload-config'
import { getPayload } from 'payload'

import { SITE } from '@/lib/site'

/**
 * Отклик на вакансию (анкета-мастер v2). Схему Payload не меняем: анкета
 * сохраняется в коллекцию zayavki (subject «Отклик на вакансию…», анкета —
 * форматированным текстом в message) — кадры видят её в /admin рядом с
 * заявками. Письмо уходит в приёмную завода; если соискатель оставил e-mail —
 * ему уходит копия анкеты (может перечитать, поправить и прислать заново).
 *
 * Антиспам — как /api/zayavka: honeypot + SmartCaptcha при заданном ключе.
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

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

export async function POST(req: Request) {
  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return bad(400, 'bad_json')
  }

  // Honeypot: у людей поле скрыто и пусто; бот его заполняет.
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return Response.json({ ok: true })
  }

  const name = str(body.name, 200)
  const phone = str(body.phone, 100)
  const email = str(body.email, 200)
  const vacancy = str(body.vacancy, 200)
  if (!name || !phone || !vacancy) return bad(400, 'missing_fields')
  // Анкета собрана мастером: [вопрос, ответ][] — сервер только форматирует
  const answers = Array.isArray(body.answers)
    ? (body.answers as unknown[])
        .filter((a): a is [unknown, unknown] => Array.isArray(a) && a.length === 2)
        .map(([q, a]) => [String(q).slice(0, 200), String(a).slice(0, 3000)] as const)
        .slice(0, 40)
    : []

  const ip = req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for')?.split(',')[0] || ''
  const token = typeof body.smartToken === 'string' ? body.smartToken : undefined
  if (!(await checkSmartCaptcha(token, ip))) return bad(403, 'captcha')

  const subject = `Отклик на вакансию: ${vacancy} — ${name}`
  const lines = [
    `Вакансия: ${vacancy}`,
    `ФИО: ${name}`,
    `Телефон: ${phone}`,
    `E-mail: ${email || '— не указан —'}`,
    '',
    ...answers.map(([q, a]) => `${q}\n${a}\n`),
  ]
  const text = lines.join('\n')

  const payload = await getPayload({ config })
  await payload.create({
    collection: 'zayavki',
    data: { name, contact: [phone, email].filter(Boolean).join(', '), message: text, subject },
    overrideAccess: true,
  })

  // Письма — best-effort: анкета уже в админке, сбой почты не роняет отклик.
  try {
    await payload.sendEmail({
      to: SITE.emails.office,
      subject,
      text: `${text}\n\n— анкета с сайта ${SITE.url}/new/vakansii/`,
    })
  } catch (e) {
    payload.logger.error(`[rezyume] письмо в приёмную не ушло: ${String(e)}`)
  }
  if (email) {
    try {
      await payload.sendEmail({
        to: email,
        subject: `Копия вашей анкеты — ${SITE.shortName}`,
        text:
          `Здравствуйте, ${name}!\n\nВы откликнулись на вакансию «${vacancy}» на сайте ${SITE.shortName}. ` +
          `Ниже — копия вашей анкеты. Если захотите что-то дополнить или исправить — заполните анкету заново на ${SITE.url}/new/vakansii/ ` +
          `или ответьте на это письмо.\n\n${'='.repeat(40)}\n\n${text}\n\n` +
          `Отдел кадров: г. Малмыж, ул. Дружбы, 2.\n${SITE.name}`,
      })
    } catch (e) {
      payload.logger.error(`[rezyume] копия соискателю не ушла: ${String(e)}`)
    }
  }

  return Response.json({ ok: true })
}
