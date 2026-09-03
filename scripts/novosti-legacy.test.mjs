// Тесты разделения унаследованных записей на жанры и сборки ленты —
// без БД и сервера (идея #098). Запуск: `pnpm test`.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

import { LEGACY_GENRES, decodeEntities, htmlToPlainText, legacyGenre } from '../src/lib/novosti/legacy.ts'
import {
  FEED_PAGE_SIZE,
  feedItemFromNovost,
  feedItemFromPage,
  mergeFeed,
  novostHref,
  paginate,
  slugFromParam,
} from '../src/lib/novosti/feed.ts'
import { translit } from '../src/lib/novosti/ingest.ts'

const pages = JSON.parse(readFileSync(new URL('../content/pages.json', import.meta.url), 'utf8'))

/**
 * Главный гейт разделения: список жанров обязан совпадать с множеством
 * `isPost`-страниц один в один. Разъедется — запись молча выпадет из обоих
 * списков сайта (или попадёт не в тот), и заметить это будет нечем.
 */
test('список жанров покрывает ровно все isPost-страницы стадии 1', () => {
  const real = pages.filter((p) => p.isPost).map((p) => p.slug).sort()
  const listed = Object.keys(LEGACY_GENRES).sort()
  const missing = real.filter((s) => !listed.includes(s))
  const extra = listed.filter((s) => !real.includes(s))
  assert.deepEqual(missing, [], 'записи есть в контенте, но не размечены')
  assert.deepEqual(extra, [], 'размечены записи, которых нет в контенте')
  assert.equal(real.length, 42)
})

test('жанры разложены на две непустые группы, дат хватает всем', () => {
  const values = Object.values(LEGACY_GENRES)
  const hronika = values.filter((g) => g === 'hronika').length
  assert.equal(hronika, 23)
  assert.equal(values.length - hronika, 19)
  // Дата — обязательное условие попадания в ленту: без неё запись отбрасывается.
  const undated = pages.filter((p) => p.isPost && !p.published)
  assert.deepEqual(undated, [])
})

test('незнакомая запись считается статьёй, а не проваливается между списками', () => {
  assert.equal(legacyGenre('/den-polya-2020/'), 'hronika')
  assert.equal(legacyGenre('/pribory-i-mufty-dizelya-d6/'), 'statya')
  assert.equal(legacyGenre('/чего-то-нового/'), 'statya')
})

test('decodeEntities: именованные, десятичные и шестнадцатеричные', () => {
  assert.equal(decodeEntities('&laquo;Д6&raquo; &mdash; &#1076;&#1074;&#x438;&#x433;&amp;'), '«Д6» — двиг&')
  assert.equal(decodeEntities('&unknown; &#999999999999;'), '&unknown; &#999999999999;')
})

test('htmlToPlainText: абзацы сохранены, скрипты и теги вычищены', () => {
  const html =
    '<div><script>alert(1)</script><p>Первый абзац.</p><p>Второй&nbsp;абзац<br>с переносом.</p>' +
    '<ul><li>пункт</li></ul></div>'
  const text = htmlToPlainText(html)
  assert.ok(!text.includes('alert'), text)
  assert.ok(!text.includes('<'), text)
  assert.equal(text.split('\n\n')[0], 'Первый абзац.')
  assert.ok(text.includes('Второй абзац\nс переносом.'), JSON.stringify(text))
  assert.ok(text.includes('пункт'))
})

test('htmlToPlainText на настоящей записи харвеста не оставляет разметки', () => {
  const post = pages.find((p) => p.slug === '/den-polya-2020/')
  const text = htmlToPlainText(post.html)
  assert.ok(text.length > 200, `слишком коротко: ${text.length}`)
  assert.ok(!/[<>]/.test(text), 'осталась разметка')
  assert.ok(!/&[a-z]+;/i.test(text), 'остались сущности')
})

test('translit: кириллица уходит в латиницу, адрес остаётся ASCII', () => {
  assert.equal(translit('Щука ёж въезд'), 'schuka ezh vezd')
  assert.equal(translit('Д-240'), 'd-240')
  assert.ok(/^[\x20-\x7e]*$/.test(translit('Отгрузили двигатель')), 'не-ASCII в результате')
})

const novost = (over = {}) => ({
  id: 7,
  title: 'Отгрузили двигатель',
  slug: 'otgruzili-dvigatel-1001',
  publishedAt: '2026-08-20T09:00:00.000Z',
  excerpt: 'Короткая аннотация',
  body: 'Тело записи',
  cover: { id: 3, filename: 'vk-1.jpg', alt: 'Двигатель' },
  images: [],
  rubrika: { id: 1, name: 'Производство' },
  ...over,
})

test('feedItemFromNovost: обложка через стабильный media-URL, рубрика по имени', () => {
  const it = feedItemFromNovost(novost())
  assert.equal(it.href, '/novosti/otgruzili-dvigatel-1001/')
  assert.deepEqual(it.cover, { src: '/media/3/vk-1.jpg', alt: 'Двигатель' })
  assert.equal(it.rubrika, 'Производство')
  assert.equal(it.origin, 'lenta')
})

test('feedItemFromNovost: неразвёрнутые связи не роняют карточку', () => {
  const it = feedItemFromNovost(novost({ cover: 12, rubrika: 5, excerpt: '', body: 'Текст поста' }))
  assert.equal(it.cover, null)
  assert.equal(it.rubrika, null)
  assert.equal(it.excerpt, 'Текст поста')
})

test('novostHref: пустой slug заменяется номером, не-ASCII кодируется', () => {
  assert.equal(novostHref({ id: 42, slug: null }), '/novosti/42/')
  assert.equal(novostHref({ id: 42, slug: 'митинг-1' }), '/novosti/%D0%BC%D0%B8%D1%82%D0%B8%D0%BD%D0%B3-1/')
})

test('slugFromParam: второй раз не декодируем, битую последовательность не роняем', () => {
  assert.equal(slugFromParam('trebuetsya-tokar-1005'), 'trebuetsya-tokar-1005')
  assert.equal(slugFromParam('скидка-50%'), 'скидка-50%', 'литеральный процент не должен бросать')
  assert.equal(slugFromParam('%D0%BC%D0%B8%D1%82%D0%B8%D0%BD%D0%B3'), 'митинг')
  assert.equal(slugFromParam('%E0%A4%A'), '%E0%A4%A')
})

test('feedItemFromPage: адрес не меняется, аннотация из html', () => {
  const it = feedItemFromPage({
    id: 5,
    path: '/den-polya-2020/',
    h1: 'День Поля-2020',
    html: '<p>Завод участвовал в выставке.</p>',
    ogImage: '/images/wp/2020/08/pole.jpg',
    publishedAt: '2020-08-19T00:00:00.000Z',
  })
  assert.equal(it.href, '/den-polya-2020/')
  assert.equal(it.excerpt, 'Завод участвовал в выставке.')
  assert.deepEqual(it.cover, { src: '/images/wp/2020/08/pole.jpg', alt: 'День Поля-2020' })
  assert.equal(it.origin, 'arhiv')
})

test('mergeFeed: свежее сверху, записи без даты отброшены', () => {
  const mk = (publishedAt, key) => ({ key, href: '/', title: key, publishedAt, excerpt: '', cover: null, rubrika: null, origin: 'lenta' })
  const out = mergeFeed([mk('2020-01-01', 'старая'), mk('', 'без даты'), mk('2026-05-05', 'свежая')])
  assert.deepEqual(out.map((i) => i.key), ['свежая', 'старая'])
})

test('paginate: мусор в номере страницы даёт первую, перелёт — последнюю', () => {
  const all = Array.from({ length: 30 }, (_, i) => ({ key: String(i), publishedAt: '2026-01-01' }))
  assert.equal(paginate(all, undefined).page, 1)
  assert.equal(paginate(all, 'abc').page, 1)
  assert.equal(paginate(all, '0').page, 1)
  assert.equal(paginate(all, '-3').page, 1)
  assert.equal(paginate(all, '999').page, Math.ceil(30 / FEED_PAGE_SIZE))
  const second = paginate(all, '2')
  assert.equal(second.items.length, FEED_PAGE_SIZE)
  assert.equal(second.items[0].key, String(FEED_PAGE_SIZE))
  assert.equal(second.total, 30)
  assert.equal(paginate([], '1').pages, 1)
})
