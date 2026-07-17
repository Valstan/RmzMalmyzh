import { pages, posts } from "@/lib/content";
import { SITE } from "@/lib/site";

export const dynamic = "force-static";

/** llms.txt — карта сайта для LLM-краулеров (GEO, аудит §3.1). */
export function GET() {
  const services = pages.filter((p) => p.slug.startsWith("/uslugi/") && !p.isPost);
  const products = pages.filter((p) => p.slug.startsWith("/produkciya/") && !p.isPost);
  const lines = [
    `# ${SITE.name}`,
    "",
    `> Завод в г. Малмыж (Кировская область), работает с ${SITE.foundingYear} года. Капитальный ремонт дизельных двигателей (Д6, Д12, ЯМЗ, КамАЗ, А-01, 6NVD26 и др.), судовых и тепловозных дизелей, реверс-редукторов и гидропередач; механическая обработка, металлоконструкции, литьё. Работаем со всеми регионами России.`,
    "",
    `Контакты: ${SITE.phones.join(", ")}; отдел сбыта ${SITE.emails.sales}. Адрес: ${SITE.address}.`,
    "",
    "## Услуги",
    ...services.map((p) => `- [${p.h1}](${SITE.url}${p.slug})`),
    "",
    "## Продукция",
    ...products.map((p) => `- [${p.h1}](${SITE.url}${p.slug})`),
    "",
    "## Техническая библиотека (статьи)",
    ...posts.slice(0, 20).map((p) => `- [${p.h1}](${SITE.url}${p.slug})`),
    "",
    "## Основное",
    `- [О предприятии](${SITE.url}/o-predpriyatii/)`,
    `- [Контакты](${SITE.url}/kontakty/)`,
    `- [Новости](${SITE.url}/novosti/)`,
  ];
  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
