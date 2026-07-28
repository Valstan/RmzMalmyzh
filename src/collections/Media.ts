import type { CollectionConfig } from 'payload'

import path from 'path'
import { fileURLToPath } from 'url'

import { adminOrEditor } from '../access/adminOrEditor'
import { anyone } from '../access/anyone'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

/**
 * Каталог с файлами медиа — единая точка правды для коллекции и для роута
 * выдачи `/media/[id]/[name]`.
 *
 * ⚠️ G146: в standalone-сборке относительный путь «запекается» в абсолютный
 * путь СБОРОЧНОЙ машины. На проде задаём `MEDIA_DIR` (персистентный каталог вне
 * релиз-директории, `/home/valstan/rmz/shared/media`) в `/etc/rmz/rmz.env`;
 * `public/media` в релизе — симлинк на него. Локально env нет → относительный путь.
 */
export const MEDIA_STATIC_DIR = process.env.MEDIA_DIR || path.resolve(dirname, '../../public/media')

export const Media: CollectionConfig = {
  slug: 'media',
  labels: {
    singular: 'Медиафайл',
    plural: 'Медиа',
  },
  access: {
    create: adminOrEditor,
    delete: adminOrEditor,
    read: anyone,
    update: adminOrEditor,
  },
  admin: {
    defaultColumns: ['filename', 'alt', 'updatedAt'],
    description:
      'Картинки сайта. Файлы с именем «wp-ГОД-МЕСЯЦ-…» — из старого сайта rmz43.ru; ' +
      'чтобы заменить такую картинку на страницах, откройте её здесь и загрузите новый файл: ' +
      'ссылки в контенте ведут на номер записи, а не на имя файла, и переживают замену.',
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      label: 'Описание (alt)',
    },
  ],
  upload: {
    staticDir: MEDIA_STATIC_DIR,
    focalPoint: true,
    mimeTypes: ['image/*'],
    imageSizes: [
      { name: 'thumbnail', width: 400 },
      { name: 'card', width: 768 },
      { name: 'wide', width: 1920 },
    ],
  },
}
