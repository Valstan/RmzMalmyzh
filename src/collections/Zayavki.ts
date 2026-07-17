import type { CollectionConfig } from 'payload'

import { adminOrEditor } from '../access/adminOrEditor'

// Заявки с форм сайта (замена mailto стадии 1). Создаются только серверным
// роутом /api/zayavka (local API); REST-создание закрыто.
export const Zayavki: CollectionConfig = {
  slug: 'zayavki',
  labels: {
    singular: 'Заявка',
    plural: 'Заявки',
  },
  access: {
    create: () => false,
    delete: adminOrEditor,
    read: adminOrEditor,
    update: adminOrEditor,
  },
  admin: {
    defaultColumns: ['name', 'contact', 'subject', 'createdAt'],
    useAsTitle: 'name',
    description: 'Заявки с форм сайта. Дубль уходит письмом в отдел сбыта (если настроен SMTP).',
  },
  fields: [
    { name: 'name', type: 'text', label: 'Имя', required: true },
    { name: 'contact', type: 'text', label: 'Телефон или e-mail', required: true },
    { name: 'message', type: 'textarea', label: 'Сообщение' },
    { name: 'subject', type: 'text', label: 'Со страницы' },
    {
      name: 'processed',
      type: 'checkbox',
      label: 'Обработана',
      defaultValue: false,
      admin: { position: 'sidebar' },
    },
  ],
  timestamps: true,
}
