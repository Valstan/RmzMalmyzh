// Парсер зеркала rmz43.ru: mirror/*.html -> content/pages.json + content/images-manifest.json
// Зеркало снимается отдельно (PowerShell Invoke-WebRequest по sitemap), в репо не коммитится.
// Использование: node scripts/parse-mirror.mjs <путь-к-mirror>
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import * as cheerio from "cheerio";

const mirrorDir = process.argv[2] || "mirror";
const postSitemap = process.argv[3]; // путь к post-sitemap.xml — что считать постом
const outDir = "content";
mkdirSync(outDir, { recursive: true });

const postSlugs = new Set();
if (postSitemap) {
  const xml = readFileSync(postSitemap, "utf8");
  for (const m of xml.matchAll(/<loc>https?:\/\/(?:www\.)?rmz43\.ru(\/[^<]*?)<\/loc>/g)) {
    postSlugs.add(m[1].endsWith("/") ? m[1] : m[1] + "/");
  }
}

const images = new Set();

function rewriteImageUrl(u) {
  if (!u) return null;
  u = u.replace(/^\/\//, "https://");
  if (!/rmz43\.ru\/wp-content\/uploads\//.test(u)) return null;
  const abs = u.startsWith("http") ? u : `https://rmz43.ru${u}`;
  const rel = abs.replace(/^https?:\/\/(www\.)?rmz43\.ru\/wp-content\/uploads\//, "");
  images.add(abs.split("?")[0]);
  return `/images/wp/${rel.split("?")[0]}`;
}

function cleanContent($, $root) {
  // мусор, не относящийся к контенту
  $root.find("script, style, noscript, link, iframe, .rev_slider_wrapper, rs-module-wrap, .pum, .pum-overlay, #wpadminbar").remove();
  // формы CF7 -> маркер для React-виджета формы
  $root.find(".wpcf7, form").each((_, el) => {
    $(el).replaceWith('<div class="rmz-form-slot"></div>');
  });
  // лениво загружаемые картинки: data-src/srcset -> src
  $root.find("img").each((_, el) => {
    const $el = $(el);
    const src = $el.attr("data-src") || $el.attr("src");
    const local = rewriteImageUrl(src);
    if (local) {
      $el.attr("src", local);
    } else if (/^data:|dummy\.png|\.svg/.test(src || "")) {
      $el.remove();
      return;
    }
    $el.removeAttr("data-src data-srcset srcset sizes class style loading");
    if (!$el.attr("alt")) $el.attr("alt", "");
  });
  // ссылки: абсолютные на rmz43.ru -> относительные
  $root.find("a").each((_, el) => {
    const $el = $(el);
    let href = $el.attr("href") || "";
    href = href.replace(/^https?:\/\/(www\.)?rmz43\.ru/, "") || "/";
    $el.attr("href", href);
    const cls = $el.attr("class") || "";
    $el.removeAttr("class style target rel");
    if (/dt-btn|vc_btn3|btn/.test(cls)) $el.attr("class", "btn");
  });
  // WPBakery-сетка -> простые row/col классы (стилизуются в globals.css)
  $root.find("[class]").each((_, el) => {
    const $el = $(el);
    const cls = $el.attr("class") || "";
    const out = [];
    if (/vc_row|wpb_row/.test(cls)) out.push("row");
    const m = cls.match(/vc_col-sm-(\d+)/);
    if (m) out.push("col", `col-${m[1]}`);
    if (/wpb_text_column|wpb_content_element/.test(cls) && out.length === 0) out.push("block");
    if (out.length) $el.attr("class", out.join(" "));
    else $el.removeAttr("class");
    $el.removeAttr("style data-vc-full-width data-vc-full-width-init data-vc-stretch-content");
  });
  // пустые обёртки схлопывать не будем — вложенные div безвредны
  return $root.html() || "";
}

const pages = [];
for (const f of readdirSync(mirrorDir).filter((f) => f.endsWith(".html"))) {
  const html = readFileSync(join(mirrorDir, f), "utf8");
  const $ = cheerio.load(html);
  const slug = f === "home.html" ? "/" : "/" + f.replace(/\.html$/, "").replaceAll("__", "/") + "/";
  const title = $("title").text().trim();
  const desc = $('meta[name="description"]').attr("content") || null;
  const ogImage = rewriteImageUrl($('meta[property="og:image"]').attr("content"));
  const published = $('meta[property="article:published_time"]').attr("content") || null;
  const isPost = postSlugs.has(slug);
  // заголовок страницы: The7 держит его в фэнси-хедере либо в контенте
  const h1 = $("h1").first().text().trim() || title;
  const $content = $("#content").length ? $("#content") : $("main, .wf-container-main").first();
  const contentHtml = cleanContent($, $content);
  pages.push({ slug, title, desc, h1, ogImage, published, isPost, html: contentHtml });
}

pages.sort((a, b) => a.slug.localeCompare(b.slug));
writeFileSync(join(outDir, "pages.json"), JSON.stringify(pages, null, 1), "utf8");
writeFileSync(join(outDir, "images-manifest.json"), JSON.stringify([...images].sort(), null, 1), "utf8");
console.log(`pages: ${pages.length} (posts: ${pages.filter((p) => p.isPost).length}), images: ${images.size}`);
