/**
 * Унаследованные записи стадии 1: разделение на два жанра.
 *
 * На старом сайте 42 страницы помечены `isPost` и вперемешку лежали в одном
 * списке `/novosti/`. Половина — заводская хроника (событие: визит, стройка,
 * покупка техники, награда), половина — техническая библиотека по дизелю Д6
 * (устройство узла, регламент ТО, диагностика). Владелец разделил их на два
 * раздела: лента `/novosti/` и статьи `/stati/`.
 *
 * ⚠️ Жанр записан списком РУКАМИ, потому что по коду он не определяется:
 * среди хроники есть текст на 5000 знаков (портрет бригадира), среди статей —
 * на 1900 (почему важен ремонт редукторов). Заголовок тоже не помогает:
 * «Ремонт дизель-генераторной установки Cummins» — это рассказ о контракте и
 * командировке через паром, а не про ремонт.
 *
 * ⚠️ Адреса записей НЕ меняются. Переезжает только список: `/novosti/` — лента,
 * `/stati/` — статьи. Редирект со старых адресов не ставим сознательно: он
 * ничего не даёт (новый адрес не релевантнее старого), но стоит ссылочного веса
 * 23 страниц, живущих с 2020 года, и превращает 586 внутренних ссылок в блоке
 * «свежие записи» на самих страницах в переходы через хоп.
 */

export type Genre = 'hronika' | 'statya'

/**
 * Путь → жанр. Список закрытый и исторический: новые записи ленты живут в
 * коллекции `novosti`, новые статьи заводятся страницей с галкой «Техстатья».
 * Гейт в CI требует, чтобы список совпадал с множеством `isPost`-страниц.
 */
export const LEGACY_GENRES: Readonly<Record<string, Genre>> = {
  // ── Хроника завода: событие, дата, люди ───────────────────────────────
  '/22178-2/': 'hronika', // Второе дыхание цеха №4: реконструкция после пожара
  '/24989-2/': 'hronika', // Митинг в честь Дня Победы
  '/4146-2/': 'hronika', // Реконструкция цеха №4
  '/46175-2/': 'hronika', // Передовики производства (портрет бригадира)
  '/6903-2/': 'hronika', // Строительство сталелитейного цеха
  '/7854-2/': 'hronika', // Договор с Савальским политехническим техникумом
  '/akcionernoe-obshhestvo/': 'hronika', // Переименование и назначение директора
  '/besplatnaya-dostavka/': 'hronika', // Объявление о новой услуге
  '/den-polya-2020/': 'hronika', // Участие в выставке «День Поля»
  '/malmyzhskiy-remzavod-otkrytie-novyh-gorizontov-mezhdunarodnogo-sotrudnichestva/': 'hronika',
  '/malmyzhskiy-remzavod-vnov-prinyal-delegatsiyu-iz-malayzii/': 'hronika',
  '/novost/': 'hronika', // Новая проходная на заводе
  '/popolnenie-avtoparka-na-nashem-zavode/': 'hronika',
  '/popolnenie-v-avtoparke/': 'hronika',
  '/rasshiren-assortiment-remontiruemykh-dvigatelej/': 'hronika',
  '/remont-dizelno-generatornoy-ustanovki-na-baze-dvs-cummins-qsk-60/': 'hronika', // контракт и командировка, не разбор
  '/remont-dvigatelya-v2-450/': 'hronika', // поступил в ремонт двигатель с земснаряда
  '/sotrudnichestvo-s-mchs-rossii/': 'hronika',
  '/sotrudnichestvo-s-pao-chkpz/': 'hronika',
  '/uborka-zernovykh-kultur/': 'hronika',
  '/vazhnoe-obnovlenie-dlya-nashego-zavoda/': 'hronika',
  '/za-vysokie-trudovye-dostizheniya-i-znachitelnyy-vklad/': 'hronika',
  '/znachitelnye-obnovleniya-na-malmyzhskom-remzavode-novye-vozmozhnosti-s-sovremennymi-stankami/':
    'hronika',

  // ── Техническая библиотека: устройство, регламент, диагностика ────────
  '/dizelnyy-dvigatel-d6-legenda-sovetskogo-mashinostroeniya-i-sovremennyy-podhod-k-ego-remontu/':
    'statya',
  '/ekspluatatsiya-dizelya-d6-polnoe-rukovodstvo/': 'statya',
  '/elektrooborudovanie-dizelnogo-dvigatelya-d6/': 'statya',
  '/instruktsiya-po-hraneniyu-konservatsii-i-priemke-dizelnyh-dvigateley-serii-d6/': 'statya',
  '/karter-dvigatelya-d6-serdtsevina-nadezhnosti-i-osnova-dlya-kapitalnogo-remonta/': 'statya',
  '/kompleksnoe-rukovodstvo-po-diagnostike-bystrohodnyh-dizeley-serii-d6/': 'statya',
  '/krivoshipno-shatunnyy-mehanizm-dizelya-d6/': 'statya',
  '/mehanizm-gazoraspredeleniya-dizelya-d6/': 'statya',
  '/pochemu-vazhen-remont-sudovykh-reduktorov/': 'statya', // ни даты, ни события — объясняет назначение узла
  '/pribory-i-mufty-dizelya-d6/': 'statya',
  '/puskovye-ustroystva-dizelya-d6-polnoe-rukovodstvo/': 'statya',
  '/rukovodstvo-po-tehnicheskomu-obsluzhivaniyu-i-ekspluatatsii-dizeley-serii-d6/': 'statya',
  '/sistema-ohlazhdeniya-dizelnogo-dvigatelya-d6-kak-rabotaet-serdtse-motora/': 'statya',
  '/sistema-smazki-dizelnyh-dvigateley-d6-podrobnoe-rukovodstvo/': 'statya',
  '/statsionarnaya-ustanovka-dizelya-d6/': 'statya',
  '/tokarnaya-obrabotka-izgotovlenie-i-restavratsiya-detaley/': 'statya', // порядок работ, а не событие
  '/toplivopodayuschaya-sistema-dizelnogo-dvigatelya-d6-polnyy-obzor-ot-ekspertov/': 'statya',
  '/upravlenie-dizelnym-dvigatelem-d6-ustroystva-printsip-raboty-i-vazhnost-obsluzhivaniya/':
    'statya',
  '/vse-ob-upravlenii-dizelnym-dvigatelem-d6-sistemy-paneli-obsluzhivanie/': 'statya',
}

/**
 * Жанр записи. Неизвестный путь — `statya`: галка «Техстатья» исторически и
 * значила «технический материал», а незнакомая запись обязана быть где-то
 * видимой, а не проваливаться между двумя списками.
 */
export const legacyGenre = (path: string): Genre => LEGACY_GENRES[path] ?? 'statya'

const ENTITIES: Readonly<Record<string, string>> = {
  nbsp: ' ',
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  laquo: '«',
  raquo: '»',
  mdash: '—',
  ndash: '–',
  hellip: '…',
  rsquo: '’',
  lsquo: '‘',
  ldquo: '“',
  rdquo: '”',
  deg: '°',
  nbsp_: ' ',
}

/** HTML-сущности → символы. Именованных в харвесте WP немного, числовые — общим правилом. */
export const decodeEntities = (s: string): string =>
  s.replace(/&(#[0-9]+|#x[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, name: string) => {
    if (name.startsWith('#')) {
      const code = name[1] === 'x' || name[1] === 'X' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10)
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole
    }
    return ENTITIES[name.toLowerCase()] ?? whole
  })

/**
 * HTML харвеста → читаемый текст с абзацами. Нужен только для аннотаций в
 * карточках ленты: сама страница по-прежнему рендерится своим HTML.
 */
export const htmlToPlainText = (html: string): string =>
  decodeEntities(
    html
      .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|h[1-6]|tr|blockquote|section)>/gi, '\n\n')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t ]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
