/** Реквизиты и константы сайта (сняты с rmz43.ru) */
export const SITE = {
  // G133/G134: все исходящие URL — строго punycode
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://xn--g1ajl.xn--80adkdyec4j.xn--p1ai",
  name: "АО «Малмыжский завод по ремонту дизельных двигателей»",
  shortName: "Малмыжский ремзавод",
  phones: ["+7 (952) 783-07-82", "+7 (831) 291-00-39"],
  phonesHref: ["+79527830782", "+78312910039"],
  emails: {
    sales: "sales@rmz43.ru",
    office: "m.zavod@rmz43.ru",
    tender: "tender@rmz43.ru",
  },
  address: "612920, Кировская область, г. Малмыж, ул. Дружбы, 2",
  foundingYear: 1931,
};

/** Экосистема Малмыжа: каталог сервисов на ЕСА (постулат 37, SERVICE_ONBOARDING) */
export const ECOSYSTEM = {
  // вход.вмалмыже.рф/services — punycode обязателен (G133/G134)
  servicesUrl: "https://xn--b1ae3a1a.xn--80adkdyec4j.xn--p1ai/services",
  servicesLabel: "Сервисы Малмыжа",
};

export type NavItem = { label: string; href: string; children?: NavItem[] };

export const NAV: NavItem[] = [
  { label: "Главная", href: "/" },
  {
    label: "О предприятии",
    href: "/o-predpriyatii/",
    children: [
      { label: "Производственные мощности", href: "/o-predpriyatii/proizvodstvennye-moschnosti/" },
      { label: "Сертификаты и лицензии", href: "/o-predpriyatii/sertifikaty-i-licenzii/" },
      { label: "Наши заказчики", href: "/o-predpriyatii/nashi-zakazchiki/" },
      { label: "Отзывы", href: "/o-predpriyatii/otzyvy/" },
      { label: "Галерея", href: "/galereya/" },
      { label: "Видео", href: "/o-predpriyatii/video/" },
      { label: "Раскрытие информации", href: "/raskrytie-informacii/" },
      { label: "Вопросы и ответы", href: "/voprosy-i-otvety/" },
    ],
  },
  {
    label: "Услуги",
    href: "/uslugi/",
    children: [
      { label: "Ремонт двигателей и агрегатов", href: "/uslugi/remont-dvigatelej-i-agregatov/" },
      { label: "Капитальный ремонт дизельных двигателей", href: "/uslugi/remont-dvigatelej-i-agregatov/kapitalnyy-remont-dizelnykh-dvigatelej/" },
      { label: "Механическая обработка деталей", href: "/uslugi/mekhanicheskaya-obrabotka-detalej/" },
      { label: "Изготовление металлоконструкций", href: "/uslugi/izgotovlenie-metallokonstrukciy/" },
      { label: "Литьё металла по чертежам", href: "/uslugi/litje-metalla-po-chertezham/" },
    ],
  },
  {
    label: "Продукция",
    href: "/produkciya/",
    children: [
      { label: "Дизельные двигатели", href: "/produkciya/dizelnye-dvigateli/" },
      { label: "Судовые реверс-редукторы", href: "/produkciya/sudovye-revers-reduktory/" },
      { label: "Гидропередачи для тепловозов", href: "/produkciya/gidroperedachi-dlya-teplovozov/" },
      { label: "Литейная продукция", href: "/produkciya/liteynaya-produkciya/" },
      { label: "С/х агрегаты", href: "/produkciya/s-h-agregaty/" },
      { label: "Запчасти", href: "/produkciya/zapchasti/" },
      { label: "Зерновые культуры", href: "/produkciya/zernovye-kultury/" },
    ],
  },
  { label: "Закупки", href: "/zakupki/" },
  { label: "Новости", href: "/novosti/" },
  { label: "Контакты", href: "/kontakty/" },
  { label: "Вакансии", href: "/vakansii/" },
];
