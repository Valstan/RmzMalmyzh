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

export const pages = pagesData as PageEntry[];

export const getPage = (slug: string) => pages.find((p) => p.slug === slug);

/** Все страницы кроме главной (её рендерит app/page.tsx вручную) */
export const contentPages = pages.filter((p) => p.slug !== "/");

export const posts = pages
  .filter((p) => p.isPost && p.published)
  .sort((a, b) => (b.published! < a.published! ? -1 : 1));
