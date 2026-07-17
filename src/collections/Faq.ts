import type { CollectionConfig } from 'payload'

import { adminOrEditor } from '../access/adminOrEditor'
import { anyone } from '../access/anyone'
import { revalidateSite, revalidateSiteDelete } from '../hooks/revalidateSite'

// Вопросы-ответы для /voprosy-i-otvety/ (разметка FAQPage, аудит §3.4).
export const Faq: CollectionConfig = {
  slug: 'faq',
  labels: {
    singular: 'Вопрос-ответ',
    plural: 'FAQ',
  },
  access: {
    create: adminOrEditor,
    delete: adminOrEditor,
    read: anyone,
    update: adminOrEditor,
  },
  admin: {
    defaultColumns: ['question', 'order', 'updatedAt'],
    useAsTitle: 'question',
  },
  defaultSort: 'order',
  fields: [
    {
      name: 'question',
      type: 'text',
      label: 'Вопрос',
      required: true,
    },
    {
      name: 'answer',
      type: 'textarea',
      label: 'Ответ',
      required: true,
    },
    {
      name: 'links',
      type: 'array',
      label: 'Ссылки под ответом',
      fields: [
        { name: 'href', type: 'text', label: 'Путь', required: true },
        { name: 'label', type: 'text', label: 'Текст ссылки', required: true },
      ],
    },
    {
      name: 'order',
      type: 'number',
      label: 'Порядок',
      defaultValue: 0,
      admin: {
        position: 'sidebar',
      },
    },
  ],
  hooks: {
    afterChange: [revalidateSite],
    afterDelete: [revalidateSiteDelete],
  },
}
