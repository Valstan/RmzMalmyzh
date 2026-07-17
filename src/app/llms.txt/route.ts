import { getAllPages, getPosts } from "@/lib/cms";
import { SITE } from "@/lib/site";

// ISR вместо force-static: CI собирает с пустой БД, список наполняется на проде.
export const revalidate = 3600;

/** llms.txt — карта сайта для LLM-краулеров (GEO, аудит §3.1). */
export async function GET() {
  const pages = await getAllPages();
  const posts = await getPosts();
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
    "## Техническая библиотека (статьи)",
    ...posts.slice(0, 20).map((p) => `- [${p.h1}](${SITE.url}${p.path})`),
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
