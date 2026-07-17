/**
 * Локальная синхронизация схемы БД (drizzle push) вне dev-сервера:
 *
 *   corepack pnpm payload run src/seed/pushSchema.ts
 *
 * push:true срабатывает только в dev-рантайме; после добавления коллекции
 * перед `next start`/сидом прогоните этот скрипт. Прод — только миграции (#017).
 */
import config from '@payload-config'
import { getPayload } from 'payload'

await getPayload({ config })
console.log('schema ok')
process.exit(0)
