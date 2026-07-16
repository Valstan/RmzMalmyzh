// Скачивает картинки из content/images-manifest.json в public/images/wp/…
// На машинах, где node-TLS к rmz43.ru режется, есть fallback: скрипт печатает
// список недокачанного в content/images-failed.json — добить можно PowerShell'ом.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";

const manifest = JSON.parse(readFileSync("content/images-manifest.json", "utf8"));
const failed = [];
let ok = 0, skipped = 0;

for (const url of manifest) {
  const rel = url.replace(/^https?:\/\/(www\.)?rmz43\.ru\/wp-content\/uploads\//, "");
  const dest = join("public", "images", "wp", rel);
  if (existsSync(dest)) { skipped++; continue; }
  mkdirSync(dirname(dest), { recursive: true });
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(40000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
    ok++;
  } catch (e) {
    failed.push(url);
    console.error(`FAIL ${url}: ${e.message}`);
  }
}
writeFileSync("content/images-failed.json", JSON.stringify(failed, null, 1), "utf8");
console.log(`ok: ${ok}, skipped: ${skipped}, failed: ${failed.length}`);
