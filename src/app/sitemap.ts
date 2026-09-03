import type { MetadataRoute } from "next";
import { getAllPages, getNovosti } from "@/lib/cms";
import { novostHref } from "@/lib/novosti/feed";
import { SITE } from "@/lib/site";

// ISR вместо force-static: CI собирает с пустой БД, карта наполняется на проде.
// Только рантайм: CI собирает с пустой БД, поэтому статический пререндер запёк бы
// пустую страницу и отдавал её до первой ревалидации — час после каждого деплоя.
// Вторая причина — ссылки /media/<id>/… привязаны к конкретной базе, так что
// пререндер на сборочной БД был бы не устаревшим, а прямо неверным.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [pages, novosti] = await Promise.all([getAllPages(), getNovosti()]);

  const entries: MetadataRoute.Sitemap = [
    // Страницы со своими роутами. `/novosti/` перечислен здесь намеренно, хотя
    // запись с таким path осталась и в `pages`: дедупликация ниже оставит одну.
    { url: `${SITE.url}/novosti/`, priority: 0.8 },
    { url: `${SITE.url}/stati/`, priority: 0.8 },
    { url: `${SITE.url}/voprosy-i-otvety/`, priority: 0.8 },
    ...novosti.map((n) => ({
      url: SITE.url + novostHref(n),
      lastModified: new Date(n.updatedAt),
      priority: 0.5,
    })),
    ...pages.map((p) => ({
      url: `${SITE.url}${p.path}`,
      lastModified: p.publishedAt ? new Date(p.publishedAt) : undefined,
      priority: p.path === "/" ? 1 : p.isPost ? 0.5 : 0.7,
    })),
  ];

  // Два <loc> с одним адресом — ошибка карты (Вебмастер её помечает), а
  // источников у нас теперь три: свои роуты, лента и страницы. Первое
  // вхождение выигрывает: у своих роутов приоритет выставлен осознанно.
  const byUrl = new Map<string, MetadataRoute.Sitemap[number]>();
  for (const e of entries) if (!byUrl.has(e.url)) byUrl.set(e.url, e);
  return [...byUrl.values()];
}
