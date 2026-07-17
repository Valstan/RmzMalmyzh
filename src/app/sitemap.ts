import type { MetadataRoute } from "next";
import { pages } from "@/lib/content";
import { SITE } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    // Страницы вне pages.json (новые, не из копии WP)
    { url: `${SITE.url}/voprosy-i-otvety/`, priority: 0.8 },
    ...pages.map((p) => ({
      url: `${SITE.url}${p.slug}`,
      lastModified: p.published ? new Date(p.published) : undefined,
      priority: p.slug === "/" ? 1 : p.isPost ? 0.5 : 0.7,
    })),
  ];
}
