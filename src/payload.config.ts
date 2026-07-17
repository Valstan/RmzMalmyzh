import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import sharp from 'sharp'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'

import { Pages } from './collections/Pages'
import { Faq } from './collections/Faq'
import { Media } from './collections/Media'
import { Users } from './collections/Users'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: ' — Малмыжский ремзавод',
    },
  },
  editor: lexicalEditor(),
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
    // MVP/greenfield: push автосинхронизирует схему в dev/CI. Прод-миграции —
    // вручную на этапе деплоя (паттерн Sabantuy/Kazanskaya, #017).
    push: true,
  }),
  collections: [Pages, Faq, Media, Users],
  cors: [process.env.NEXT_PUBLIC_SERVER_URL || ''].filter(Boolean),
  secret: process.env.PAYLOAD_SECRET || '',
  sharp,
  // Локализация не включена: сайт завода — только русский.
  i18n: {
    fallbackLanguage: 'ru',
  },
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
})
