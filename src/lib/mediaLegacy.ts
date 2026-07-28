/**
 * Харвест-картинки WP → коллекция `media` (аудит §4.2).
 *
 * Стадия 1 сложила 180 файлов статикой в `public/images/wp/<год>/<месяц>/`, и
 * контент 128 страниц ссылается на них 521 раз. Такие картинки редактор из
 * админки заменить не может — их просто нет в Медиа. Здесь чистые функции
 * отображения legacy-пути в media-документ; ими пользуются и скрипт импорта
 * (`src/seed/mediaFromContent.ts`), и роут выдачи файла (`/media/[id]/[name]`).
 */

/** Ссылка на харвест внутри HTML-контента: и `src=`, и `<a href=>` на полный размер. */
export const LEGACY_IMG_RE = /\/images\/wp\/\d{4}\/\d{2}\/[^"'\s)<>]+/g

/** `<img …>` целиком — нужен, чтобы вытащить alt рядом с src. */
export const IMG_TAG_RE = /<img\b[^>]*>/g

/** Стабильный URL картинки в контенте. */
export const MEDIA_URL_RE = /\/media\/\d+\/[^"'\s)<>]+/g

/**
 * `/images/wp/2020/03/3d6-350x250.jpg` → `wp-2020-03-3d6-350x250.jpg`.
 *
 * `media` хранит `filename` плоско, а в харвесте два базовых имени встречаются
 * в разных месяцах (`dd-6chn18-22.jpg`, `sudovoj_dvigatel_nvd-26.jpg`) — префикс
 * «год-месяц» и разводит эти коллизии, и оставляет видимым происхождение файла
 * в списке Медиа.
 *
 * ⚠️ Варианты размеров WP (`-350x250`) НЕ схлопываем в оригинал: 34 из 76 —
 * реальные кропы (до 51% разницы аспекта), кадр бы поехал. Импорт 1:1, рендер
 * остаётся прежним.
 */
export function legacyPathToFilename(legacyPath: string): string | null {
  const m = legacyPath.match(/^\/images\/wp\/(\d{4})\/(\d{2})\/(.+)$/)
  if (!m) return null
  const [, year, month, base] = m
  // Файл из URL может прийти percent-encoded; в media кладём декодированное имя.
  let name: string
  try {
    name = decodeURIComponent(base)
  } catch {
    name = base
  }
  if (name.includes('/') || name.includes('\\')) return null
  return `wp-${year}-${month}-${name}`
}

/**
 * Стабильный URL: id документа не меняется при замене файла в админке, поэтому
 * ссылки в контенте переживают загрузку нового файла с другим именем. Имя в
 * хвосте — косметика (читаемые логи и осмысленное имя при «сохранить как»).
 */
export function mediaUrl(id: string | number, filename: string): string {
  return `/media/${id}/${encodeURIComponent(filename)}`
}
