import pagesData from "../../content/pages.json";

export type PageEntry = {
  slug: string;
  title: string;
  desc: string | null;
  h1: string;
  ogImage: string | null;
  published: string | null;
  isPost: boolean;
  html: string;
};

/** Аудит §2.2: 397 из 478 картинок WP без alt. Автогенерация: h1 страницы + хвост
 *  из имени файла (WP-имена — латинский translit, но лучше, чем пустота). */
function withAlts(p: PageEntry): PageEntry {
  let n = 0;
  const html = p.html.replace(/<img\b[^>]*>/g, (tag) => {
    if (/alt="[^"]/.test(tag)) return tag;
    n += 1;
    const file = tag.match(/src="[^"]*\/([^/"]+?)(?:-\d+x\d+)?\.\w+"/)?.[1] ?? "";
    const hint = file.replace(/[-_]+/g, " ").trim();
    const alt = hint ? `${p.h1} — ${hint}` : `${p.h1} — фото ${n}`;
    return tag.replace(/\balt=""\s*/, "").replace(/^<img\b/, `<img alt="${alt.replace(/"/g, "")}"`);
  });
  return { ...p, html };
}

export const pages = (pagesData as PageEntry[]).map(withAlts);

export const getPage = (slug: string) => pages.find((p) => p.slug === slug);

/** Все страницы кроме главной (её рендерит app/page.tsx вручную) */
export const contentPages = pages.filter((p) => p.slug !== "/");

export const posts = pages
  .filter((p) => p.isPost && p.published)
  .sort((a, b) => (b.published! < a.published! ? -1 : 1));
