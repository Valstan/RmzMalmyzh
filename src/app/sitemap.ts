import type { MetadataRoute } from "next";
import { getAllPages } from "@/lib/cms";
import { SITE } from "@/lib/site";

// ISR вместо force-static: CI собирает с пустой БД, карта наполняется на проде.
// Только рантайм: CI собирает с пустой БД, поэтому статический пререндер запёк бы
// пустую страницу и отдавал её до первой ревалидации — час после каждого деплоя.
// Вторая причина — ссылки /media/<id>/… привязаны к конкретной базе, так что
// пререндер на сборочной БД был бы не устаревшим, а прямо неверным.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = await getAllPages();
  return [
    // Страницы вне Payload (свои роуты)
    { url: `${SITE.url}/voprosy-i-otvety/`, priority: 0.8 },
    ...pages.map((p) => ({
      url: `${SITE.url}${p.path}`,
      lastModified: p.publishedAt ? new Date(p.publishedAt) : undefined,
      priority: p.path === "/" ? 1 : p.isPost ? 0.5 : 0.7,
    })),
  ];
}
