import type { CollectionConfig } from 'payload'

import { adminOrEditor } from '../access/adminOrEditor'
import { authenticatedOrPublished } from '../access/authenticatedOrPublished'
import { populatePublishedAt } from '../hooks/populatePublishedAt'
import { revalidateSite, revalidateSiteDelete } from '../hooks/revalidateSite'

// Все контентные страницы сайта, включая техстатьи (isPost). Модель 1:1 повторяет
// content/pages.json стадии 1: контент харвестнут с rmz43.ru как готовый HTML (поле
// html, рендер через ContentHtml). Новые страницы можно писать в richText (content) —
// фронт рендерит его, когда html пуст.
export const Pages: CollectionConfig<'pages'> = {
  slug: 'pages',
  labels: {
    singular: 'Страница',
    plural: 'Страницы',
  },
  access: {
    create: adminOrEditor,
    delete: adminOrEditor,
    read: authenticatedOrPublished,
    update: adminOrEditor,
  },
  admin: {
    defaultColumns: ['path', 'h1', 'isPost', 'updatedAt'],
    useAsTitle: 'h1',
  },
  fields: [
    {
      name: 'path',
      type: 'text',
      label: 'Путь (URL)',
      required: true,
      unique: true,
      index: true,
      admin: {
        description: 'Полный путь страницы со слэшами: /uslugi/litejnoe-proizvodstvo/',
      },
    },
    {
      name: 'h1',
      type: 'text',
      label: 'Заголовок (H1)',
      required: true,
    },
    {
      name: 'title',
      type: 'text',
      label: 'Title (SEO)',
      admin: {
        description: 'Если пусто — берётся H1.',
      },
    },
    {
      name: 'desc',
      type: 'textarea',
      label: 'Description (SEO)',
    },
    {
      name: 'html',
      type: 'code',
      label: 'HTML-контент (харвест rmz43.ru)',
      admin: {
        language: 'html',
        description: 'Контент стадии 1. Для новых страниц оставьте пустым и заполните «Содержимое».',
      },
    },
    {
      name: 'content',
      type: 'richText',
      label: 'Содержимое (для новых страниц)',
    },
    {
      name: 'isPost',
      type: 'checkbox',
      label: 'Техстатья (пост)',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Посты попадают в ленту /novosti/ и получают разметку TechArticle.',
      },
    },
    {
      name: 'ogImage',
      type: 'text',
      label: 'OG-картинка (путь)',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'publishedAt',
      type: 'date',
      label: 'Дата публикации',
      admin: {
        position: 'sidebar',
      },
    },
  ],
  hooks: {
    beforeChange: [populatePublishedAt],
    afterChange: [revalidateSite],
    afterDelete: [revalidateSiteDelete],
  },
  versions: {
    drafts: true,
  },
}
