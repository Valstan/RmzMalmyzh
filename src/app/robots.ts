import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    // Аудит §3.2: явная политика для ИИ-краулеров — заводу НУЖНО попадать в ответы LLM
    rules: [
      // /new/ — превью нового интерфейса (v2), дубли контента в поиск не отдаём
      { userAgent: "*", allow: "/", disallow: "/new/" },
      {
        userAgent: ["GPTBot", "ClaudeBot", "Claude-Web", "PerplexityBot", "YandexAdditional", "Google-Extended"],
        allow: "/",
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
