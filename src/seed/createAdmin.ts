/**
 * Создание/обновление админа Payload (используется setup-prod-stage2.yml):
 *
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... corepack pnpm payload run src/seed/createAdmin.ts
 *
 * Идемпотентно: пользователь с таким email есть → обновляется пароль (сброс через
 * повторный запуск воркфлоу). Пароль хэширует сам Payload.
 */
import config from '@payload-config'
import { getPayload } from 'payload'

const email = process.env.ADMIN_EMAIL
const password = process.env.ADMIN_PASSWORD
if (!email || !password) {
  console.error('ADMIN_EMAIL и ADMIN_PASSWORD обязательны')
  process.exit(1)
}

const payload = await getPayload({ config })
const existing = await payload.find({ collection: 'users', where: { email: { equals: email } }, limit: 1 })
if (existing.docs.length > 0) {
  await payload.update({
    collection: 'users',
    id: existing.docs[0].id,
    data: { password, roles: ['admin'] },
  })
  console.log(`admin обновлён: ${email}`)
} else {
  await payload.create({
    collection: 'users',
    data: { email, password, name: 'Администратор', roles: ['admin'] },
  })
  console.log(`admin создан: ${email}`)
}
process.exit(0)
