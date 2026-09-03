import { getAllPages, getFeed, getStati } from "@/lib/cms";
import { SITE } from "@/lib/site";

// ISR вместо force-static: CI собирает с пустой БД, список наполняется на проде.
// Только рантайм: CI собирает с пустой БД, поэтому статический пререндер запёк бы
// пустую страницу и отдавал её до первой ревалидации — час после каждого деплоя.
// Вторая причина — ссылки /media/<id>/… привязаны к конкретной базе, так что
// пререндер на сборочной БД был бы не устаревшим, а прямо неверным.
export const dynamic = "force-dynamic";

/** llms.txt — карта сайта для LLM-краулеров (GEO, аудит §3.1). */
export async function GET() {
  const [pages, stati, feed] = await Promise.all([getAllPages(), getStati(), getFeed()]);
  const services = pages.filter((p) => p.path.startsWith("/uslugi/") && !p.isPost);
  const products = pages.filter((p) => p.path.startsWith("/produkciya/") && !p.isPost);
  const lines = [
    `# ${SITE.name}`,
    "",
    `> Завод в г. Малмыж (Кировская область), работает с ${SITE.foundingYear} года. Капитальный ремонт дизельных двигателей (Д6, Д12, ЯМЗ, КамАЗ, А-01, 6NVD26 и др.), судовых и тепловозных дизелей, реверс-редукторов и гидропередач; механическая обработка, металлоконструкции, литьё. Работаем со всеми регионами России.`,
    "",
    `Контакты: ${SITE.phones.join(", ")}; отдел сбыта ${SITE.emails.sales}. Адрес: ${SITE.address}.`,
    "",
    "## Услуги",
    ...services.map((p) => `- [${p.h1}](${SITE.url}${p.path})`),
    "",
    "## Продукция",
    ...products.map((p) => `- [${p.h1}](${SITE.url}${p.path})`),
    "",
    `## Техническая библиотека — устройство и обслуживание дизелей Д6 (${SITE.url}/stati/)`,
    ...stati.map((p) => `- [${p.h1}](${SITE.url}${p.path})`),
    "",
    `## Новости завода (${SITE.url}/novosti/)`,
    ...feed.slice(0, 15).map((it) => `- [${it.title}](${SITE.url}${it.href}) — ${it.publishedAt.slice(0, 10)}`),
    "",
    "## Основное",
    `- [О предприятии](${SITE.url}/o-predpriyatii/)`,
    `- [Контакты](${SITE.url}/kontakty/)`,
  ];
  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
