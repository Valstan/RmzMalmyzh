// Тесты чистой логики ленты новостей — без БД, HTTP и сервера (идея #098).
// Запуск: `pnpm test` (Node ≥ 23.6 снимает типы с .ts сам, флаги не нужны).
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

import {
  cleanVkText,
  excerptFromText,
  largestPhotoUrl,
  normalizeWall,
  parseIngestRequest,
  secretMatches,
  slugFor,
  titleFromText,
} from '../src/lib/novosti/ingest.ts'

const wall = JSON.parse(
  readFileSync(new URL('../src/lib/novosti/fixtures/wall.sample.json', import.meta.url), 'utf8'),
)

test('cleanVkText: разметка сообществ, хештеги с @, CRLF и лишние пустые строки', () => {
  const out = cleanVkText('Текст [club1|Клуб] и [id2|Имя]\r\n\r\n\r\n\r\n#тег@club1  \nконец')
  assert.equal(out, 'Текст Клуб и Имя\n\n#тег\nконец')
})

test('titleFromText: первая содержательная строка, хештег в начале не заголовок, обрезка по слову', () => {
  assert.equal(titleFromText('#вакансии\nТребуется токарь.'), 'Требуется токарь.')
  const long = 'Слово '.repeat(30).trim()
  const t = titleFromText(long)
  assert.ok(t.length <= 81, `длина ${t.length}`)
  assert.ok(t.endsWith('…'))
  assert.ok(!t.includes('Слов…'), 'обрезано посреди слова')
})

test('excerptFromText: переносы схлопнуты, потолок 200', () => {
  const e = excerptFromText('a\n\nb   c')
  assert.equal(e, 'a b c')
  assert.ok(excerptFromText('x'.repeat(500)).length <= 201)
})

test('largestPhotoUrl: по площади, а не по порядку и не по букве', () => {
  assert.equal(
    largestPhotoUrl([
      { url: 'https://i/1', width: 1000, height: 10 },
      { url: 'https://i/2', width: 300, height: 300 },
      { url: 'ftp://bad', width: 9999, height: 9999 },
    ]),
    'https://i/2',
  )
  assert.equal(largestPhotoUrl(undefined), undefined)
})

test('normalizeWall на фикстуре: 3 поста, 2 пропуска (реклама, пустой)', () => {
  const { posts, skipped } = normalizeWall(wall.items)
  assert.equal(posts.length, 3)
  assert.deepEqual(
    skipped.map((s) => s.reason).sort(),
    ['ads', 'empty'],
  )

  const [p1, p2, p3] = posts
  assert.equal(p1.vkPostId, '-195583920_1001')
  assert.equal(p1.vkUrl, 'https://vk.com/wall-195583920_1001')
  assert.equal(p1.title, 'Отгрузили двигатель Д-240 после капитального ремонта.')
  assert.ok(p1.body.includes('хозяйство из Кильмезского района'))
  assert.ok(p1.body.includes('#ремонт #Д240'))
  assert.ok(!p1.body.includes('\r'))
  assert.deepEqual(p1.images, ['https://img.example/a-w.jpg', 'https://img.example/b-y.jpg'])
  assert.equal(p1.publishedAt, new Date(1755680400 * 1000).toISOString())
  assert.equal(p1.repost, false)

  assert.equal(p2.repost, true, 'репост без текста берёт copy_history')
  assert.equal(p2.title, 'Поздравляем коллектив завода с Днём машиностроителя!')
  assert.deepEqual(p2.images, ['https://img.example/repost.jpg'])
  assert.equal(p2.vkPostId, '-195583920_1002', 'id репоста — наш, не оригинала')

  assert.equal(p3.title, 'Требуется токарь.')
  assert.ok(p3.excerpt.startsWith('#вакансии Требуется токарь.'))
})

test('normalizeWall: мусор вместо элементов не роняет разбор', () => {
  const { posts, skipped } = normalizeWall([null, 42, { text: 'без id' }, { id: 7, text: 'ок' }])
  assert.equal(posts.length, 1)
  assert.equal(skipped.filter((s) => s.reason === 'malformed').length, 3)
  assert.equal(normalizeWall('not-an-array').posts.length, 0)
})

test('slugFor: кириллица сохраняется, номер поста делает slug уникальным', () => {
  const { posts } = normalizeWall(wall.items)
  assert.equal(slugFor(posts[2]), 'требуется-токарь-1005')
  assert.equal(slugFor({ ...posts[2], title: '!!!' }), 'post-1005')
})

test('secretMatches: пустой ожидаемый секрет всегда false, длина и байты сравниваются', () => {
  assert.equal(secretMatches('x', undefined), false)
  assert.equal(secretMatches('x', ''), false)
  assert.equal(secretMatches('abc', 'abd'), false)
  assert.equal(secretMatches('abc', 'abc'), true)
})

test('parseIngestRequest: две формы и потолки', () => {
  assert.deepEqual(parseIngestRequest({ source: 'gateway', count: 500, offset: -3 }), {
    source: 'gateway',
    count: 100,
    offset: 0,
  })
  assert.deepEqual(parseIngestRequest({ source: 'gateway' }), { source: 'gateway', count: 20, offset: 0 })
  assert.ok('error' in parseIngestRequest({ source: 'items', items: 'nope' }))
  assert.ok('error' in parseIngestRequest({ source: 'items', items: new Array(101).fill({}) }))
  assert.ok('error' in parseIngestRequest({}))
  assert.equal(parseIngestRequest({ source: 'items', items: [] }).source, 'items')
})
