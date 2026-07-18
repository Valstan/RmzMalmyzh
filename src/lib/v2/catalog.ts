/**
 * Каталог v2 «двигатель → услуги» (аудит §4.2). Данные — статическая карта
 * поверх существующих посадочных Payload (пути 1:1 со стадией 1): новых
 * коллекций и миграций не требуется, ссылки ведут на страницы основного сайта.
 */

export type EngineModel = { model: string; path: string };

export type EngineGroup = {
  slug: string;
  title: string;
  intro: string;
  applications: string; // где встречается — техника/суда/тепловозы
  models: EngineModel[];
};

const KAP = "/uslugi/remont-dvigatelej-i-agregatov/kapitalnyy-remont-dizelnykh-dvigatelej";

export const ENGINE_GROUPS: EngineGroup[] = [
  {
    slug: "d6-d12",
    title: "Д6 / Д12 / 1Д12",
    intro:
      "Профильная серия завода: быстроходные дизели типа Д6 и Д12 ремонтируем со стендовыми испытаниями и полной дефектовкой.",
    applications: "Катера и суда, дизель-генераторы, путевые машины, спецтехника",
    models: [
      { model: "Д6, Д12, 1Д12", path: `${KAP}/remont-dizelnogo-dvigatelya-d6-d12-1d12/` },
      { model: "3Д6", path: `${KAP}/remont-dizelnogo-dvigatelya-3d6/` },
      { model: "1Д20, 3Д20, 5Д20", path: `${KAP}/remont-dizelnogo-dvigatelya-1d20-3d20-5d20/` },
      { model: "В2-450", path: `${KAP}/remont-dizelnogo-dvigatelya-v2-450/` },
      { model: "В-31М", path: `${KAP}/remont-dizelnogo-dvigatelya-v-31m/` },
    ],
  },
  {
    slug: "yamz",
    title: "ЯМЗ",
    intro:
      "Капитальный ремонт двигателей Ярославского моторного завода с заменой цилиндропоршневой группы и регулировкой топливной аппаратуры.",
    applications: "Грузовики МАЗ/КрАЗ/Урал, тракторы К-700, автобусы, генераторы",
    models: [
      { model: "ЯМЗ-236", path: `${KAP}/remont-dizelnogo-dvigatelya-yamz-236/` },
      { model: "ЯМЗ-238", path: `${KAP}/remont-dizelnogo-dvigatelya-yamz-238/` },
      { model: "ЯМЗ-240", path: `${KAP}/remont-dizelnogo-dvigatelya-yamz-240/` },
      { model: "ЯМЗ-7511", path: `${KAP}/remont-dizelnogo-dvigatelya-yamz-7511/` },
      { model: "ТМЗ-8431", path: `${KAP}/remont-dizelnogo-dvigatelya-tmz-8431/` },
    ],
  },
  {
    slug: "traktornye",
    title: "Тракторные и с/х",
    intro:
      "Двигатели тракторов и сельхозтехники: восстановление ресурса до заводских параметров, обкатка под нагрузкой.",
    applications: "МТЗ, ДТ-75, Т-130/170, комбайны Нива/Дон, погрузчики",
    models: [
      { model: "А-01", path: `${KAP}/remont-dizelnogo-dvigatelya-a-01/` },
      { model: "А-41", path: `${KAP}/remont-dizelnogo-dvigatelya-a-41/` },
      { model: "Д-160/180", path: `${KAP}/remont-dizelnogo-dvigatelya-d-160-180/` },
      { model: "Д-240/243", path: `${KAP}/remont-dizelnogo-dvigatelya-d-240-243/` },
      { model: "Д-245", path: `${KAP}/remont-dizelnogo-dvigatelya-d-245/` },
      { model: "Д-260", path: `${KAP}/remont-dizelnogo-dvigatelya-d-260/` },
      { model: "СМД-14", path: `${KAP}/remont-dizelnogo-dvigatelya-smd-14/` },
      { model: "СМД-18", path: `${KAP}/remont-dizelnogo-dvigatelya-smd-18/` },
      { model: "СМД-62", path: `${KAP}/remont-dizelnogo-dvigatelya-smd-62/` },
    ],
  },
  {
    slug: "avtomobilnye",
    title: "Автомобильные",
    intro: "Ремонт автомобильных дизелей с испытанием на тормозном стенде.",
    applications: "КамАЗ, ЗИЛ, спецшасси",
    models: [
      { model: "КамАЗ-740 (Евро, с ТКР)", path: `${KAP}/remont-dizelnogo-dvigatelya-kamaz-740-evro-s-tkr/` },
      { model: "ЗИЛ-130", path: `${KAP}/remont-dizelnogo-dvigatelya-zil-130/` },
    ],
  },
  {
    slug: "sudovye-teplovoznye",
    title: "Судовые и тепловозные",
    intro:
      "Среднеоборотные судовые и тепловозные дизели, включая импортные. Испытательные стенды позволяют сдавать двигатель с подтверждёнными параметрами.",
    applications: "Речфлот, маневровые тепловозы, дизель-генераторные установки",
    models: [
      { model: "6NVD26", path: `${KAP}/remont-dizelnogo-dvigatelya-6nvd26/` },
      { model: "6ЧН18/22", path: `${KAP}/remont-dizelnogo-dvigatelya-6chn18-22/` },
      { model: "6ЧН21/21", path: `${KAP}/remont-dizelnogo-dvigatelya-6chn21-21/` },
      { model: "Д-49 (ЧН26/26)", path: `${KAP}/remont-dizelnogo-dvigatelya-d-49-chn26-26/` },
      { model: "М-400", path: `${KAP}/remont-dizelnogo-dvigatelya-m-400/` },
      { model: "М-756", path: `${KAP}/remont-dizelnogo-dvigatelya-m-756/` },
      { model: "Шкода S160PN", path: `${KAP}/remont-dizelnogo-dvigatelya-shkoda-s160pn/` },
      { model: "Cummins QSK-60 (ДГУ)", path: "/remont-dizelno-generatornoy-ustanovki-na-baze-dvs-cummins-qsk-60/" },
    ],
  },
  {
    slug: "kompressornye",
    title: "Компрессорные станции",
    intro: "Двигатели передвижных компрессорных станций серии К.",
    applications: "ПКС, буровые, строительная техника",
    models: [
      { model: "К-161М2", path: `${KAP}/remont-dizelnogo-dvigatelya-k-161m2/` },
      { model: "К-457", path: `${KAP}/remont-dizelnogo-dvigatelya-k-457/` },
      { model: "К-562/962", path: `${KAP}/remont-dizelnogo-dvigatelya-k-562-962/` },
      { model: "К-661", path: `${KAP}/remont-dizelnogo-dvigatelya-k-661/` },
    ],
  },
];

/** Услуги/агрегаты вне «просто двигателей» — вторая половина каталога. */
export const OTHER_SERVICES = [
  {
    title: "Судовые реверс-редукторы",
    desc: "Ремонт и поставка реверс-редукторов для речного флота.",
    path: "/produkciya/sudovye-revers-reduktory/",
  },
  {
    title: "Гидропередачи для тепловозов",
    desc: "Ремонт гидропередач маневровых тепловозов.",
    path: "/produkciya/gidroperedachi-dlya-teplovozov/",
  },
  {
    title: "Механическая обработка деталей",
    desc: "Токарные, фрезерные, расточные работы по чертежам заказчика.",
    path: "/uslugi/mekhanicheskaya-obrabotka-detalej/",
  },
  {
    title: "Литьё металла по чертежам",
    desc: "Чугунное и стальное литьё, собственный литейный участок.",
    path: "/uslugi/litje-metalla-po-chertezham/",
  },
  {
    title: "Металлоконструкции",
    desc: "Изготовление металлоконструкций любой сложности.",
    path: "/uslugi/izgotovlenie-metallokonstrukciy/",
  },
  {
    title: "Запчасти",
    desc: "Запасные части к ремонтируемым сериям двигателей со склада и под заказ.",
    path: "/produkciya/zapchasti/",
  },
];

/** Этапы производственного процесса — как в цехах завода (и в учёте МатрицаРМЗ). */
export const PROCESS_STEPS = [
  { n: 1, title: "Приёмка и входной контроль", desc: "Принимаем двигатель с актом: комплектность, пломбы, фото. Организуем доставку из любого региона России." },
  { n: 2, title: "Разборка и мойка", desc: "Полная разборка до базовых деталей, мойка в моечных машинах." },
  { n: 3, title: "Дефектовка", desc: "Обмер и контроль каждой детали. Составляем дефектовочную ведомость — что восстанавливаем, что меняем." },
  { n: 4, title: "Согласование сметы", desc: "Отправляем заказчику ведомость и смету. Работы начинаются только после согласования." },
  { n: 5, title: "Ремонт и сборка", desc: "Восстановление базовых деталей, замена ЦПГ, сборка с контролем моментов и зазоров." },
  { n: 6, title: "Стендовые испытания", desc: "Обкатка и испытания под нагрузкой на собственных стендах — двигатель сдаётся с подтверждёнными параметрами." },
  { n: 7, title: "Окраска, консервация, отгрузка", desc: "Окраска, консервация по ГОСТ, упаковка и отгрузка с паспортом ремонта и гарантией." },
];

export const V2_STATS = [
  { value: "с 1931", label: "года ремонтируем дизели" },
  { value: "60+", label: "моделей двигателей в работе" },
  { value: "2000+", label: "заказчиков по всей России" },
  { value: "100%", label: "двигателей проходят стендовые испытания" },
];
