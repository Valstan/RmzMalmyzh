import type { CollectionConfig } from 'payload'

import { adminOrEditor } from '../access/adminOrEditor'
import { authenticatedOrPublished } from '../access/authenticatedOrPublished'
import { slugField } from '../fields/slug'
import { revalidateSite, revalidateSiteDelete } from '../hooks/revalidateSite'

/**
 * Лента заводской активности: посты сообщества vk.ru/rmz43 (owner_id -195583920)
 * плюс новости, написанные редактором руками.
 *
 * Почему отдельная коллекция, а не флаг на странице, как унаследованные посты в
 * `pages.isPost`: посту из VK нужны поля, которых у страницы нет и быть не должно —
 * идентификатор поста, ссылка на оригинал, набор картинок. Без `vkPostId` повторный
 * прогон импорта плодил бы дубли, а это первое, обо что спотыкается любой импортёр.
 *
 * Черновики включены намеренно: пост из VK приезжает НЕ опубликованным, редактор
 * решает, что показывать на сайте завода. Импортёр не публикует ничего сам.
 *
 * ⚠️ Картинки живут в коллекции `media`, а не ссылками на VK CDN. Две причины:
 * ссылки `sun*.userapi.com` протухают, а в `next.config.ts` нет `images.remotePatterns` —
 * хотлинк свалил бы рендер в рантайме.
 */
export const Novosti: CollectionConfig = {
  slug: 'novosti',
  labels: {
    singular: 'Новость',
    plural: 'Лента новостей',
  },
  access: {
    create: adminOrEditor,
    delete: adminOrEditor,
    read: authenticatedOrPublished,
    update: adminOrEditor,
  },
  admin: {
    defaultColumns: ['title', 'publishedAt', 'rubrika', 'source', '_status'],
    useAsTitle: 'title',
    description:
      'Лента заводской активности. Посты из сообщества ВКонтакте приезжают черновиками — публикует редактор.',
  },
  defaultSort: '-publishedAt',
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Заголовок',
      required: true,
      admin: {
        description:
          'У поста ВКонтакте заголовка нет — импортёр берёт первую строку текста. Правьте смело.',
      },
    },
    slugField('title'),
    {
      name: 'publishedAt',
      type: 'date',
      label: 'Дата',
      required: true,
      index: true,
      admin: {
        date: { pickerAppearance: 'dayAndTime' },
        description: 'Для постов ВКонтакте — дата публикации в сообществе, а не дата импорта.',
      },
    },
    {
      name: 'excerpt',
      type: 'textarea',
      label: 'Краткое описание',
      admin: {
        description:
          'Текст карточки в ленте. Хранится готовым, а не режется из тела на каждый запрос: лента копится, и обрезка регуляркой на каждом рендере обошлась бы дорого.',
      },
    },
    {
      name: 'body',
      type: 'textarea',
      label: 'Текст',
      required: true,
      admin: {
        description:
          'Текст поста как есть, с переносами строк. Разметка ВКонтакте вычищается импортёром.',
      },
    },
    {
      name: 'rubrika',
      type: 'relationship',
      relationTo: 'rubriki',
      label: 'Рубрика',
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Ставится вручную. Импортёр рубрику не угадывает — см. комментарий в Rubriki.',
      },
    },
    {
      name: 'cover',
      type: 'upload',
      relationTo: 'media',
      label: 'Обложка',
      admin: {
        position: 'sidebar',
        description: 'Картинка карточки в ленте. Импортёр берёт самое крупное фото поста.',
      },
    },
    {
      name: 'images',
      type: 'array',
      label: 'Картинки поста',
      labels: { singular: 'Картинка', plural: 'Картинки' },
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          label: 'Файл',
          required: true,
        },
      ],
    },
    {
      name: 'source',
      type: 'select',
      label: 'Источник',
      defaultValue: 'ruchnaya',
      options: [
        { label: 'ВКонтакте', value: 'vk' },
        { label: 'Написана вручную', value: 'ruchnaya' },
        { label: 'Перенесена со старого сайта', value: 'legacy' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'vkPostId',
      type: 'text',
      label: 'ID поста ВКонтакте',
      index: true,
      unique: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description:
          'Вид «owner_id_post_id». По нему импортёр узнаёт уже привезённый пост — без этого повторный прогон наплодил бы дубли.',
      },
    },
    {
      name: 'vkUrl',
      type: 'text',
      label: 'Ссылка на пост ВКонтакте',
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'legacyPath',
      type: 'text',
      label: 'Старый адрес',
      index: true,
      admin: {
        position: 'sidebar',
        description:
          'Путь записи на прежнем сайте — заполняется, если новость перенесена руками. Хроника 2020–2026 сюда НЕ переносилась: она осталась страницами на своих адресах и попадает в ленту списком (src/lib/novosti/legacy.ts).',
      },
    },
  ],
  hooks: {
    afterChange: [revalidateSite],
    afterDelete: [revalidateSiteDelete],
  },
  versions: {
    drafts: true,
  },
}
