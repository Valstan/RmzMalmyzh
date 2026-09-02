import type { CollectionConfig } from 'payload'

import { adminOrEditor } from '../access/adminOrEditor'
import { anyone } from '../access/anyone'
import { slugField } from '../fields/slug'
import { revalidateSite, revalidateSiteDelete } from '../hooks/revalidateSite'

/**
 * Тематики ленты заводских новостей.
 *
 * Рубрику ставит РЕДАКТОР, а не импортёр, и это осознанно. У Калининского СДК
 * автоклассификатор работает потому, что их сообщество метит посты хештегами и
 * владелец руками разметил эталон из 29 постов — по нему классификатор и
 * проверяется тестом. У нас нет ни хештегов в постах, ни размеченного эталона,
 * поэтому автоправила дали бы правдоподобный мусор, который нечем проверить.
 * Автоклассификатор появится отдельным PR, когда через шлюз можно будет снять
 * настоящий дамп стены и посчитать по нему статистику.
 *
 * Рубрики нарочно НЕ создаются импортом на лету (так делает Калинино): без
 * словаря-эталона это расплодило бы мусорные записи от опечаток в хештегах.
 */
export const Rubriki: CollectionConfig = {
  slug: 'rubriki',
  labels: {
    singular: 'Рубрика',
    plural: 'Рубрики ленты',
  },
  access: {
    create: adminOrEditor,
    delete: adminOrEditor,
    read: anyone,
    update: adminOrEditor,
  },
  admin: {
    defaultColumns: ['name', 'slug', 'order'],
    useAsTitle: 'name',
    description: 'Тематики, по которым делится лента новостей. Рубрику у новости ставит редактор.',
  },
  defaultSort: 'order',
  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'Название',
      required: true,
    },
    slugField('name'),
    {
      name: 'description',
      type: 'textarea',
      label: 'Описание',
      admin: {
        description: 'Показывается на странице рубрики под заголовком. Необязательно.',
      },
    },
    {
      name: 'order',
      type: 'number',
      label: 'Порядок',
      defaultValue: 0,
      admin: { position: 'sidebar' },
    },
  ],
  hooks: {
    afterChange: [revalidateSite],
    afterDelete: [revalidateSiteDelete],
  },
}
