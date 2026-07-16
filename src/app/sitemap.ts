import type { MetadataRoute } from "next";
import { pages } from "@/lib/content";
import { SITE } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return pages.map((p) => ({
    url: `${SITE.url}${p.slug}`,
    lastModified: p.published ? new Date(p.published) : undefined,
    priority: p.slug === "/" ? 1 : p.isPost ? 0.5 : 0.7,
  }));
}
