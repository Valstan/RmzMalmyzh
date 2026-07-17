import type { NextConfig } from "next";
import { withPayload } from "@payloadcms/next/withPayload";

// Стадия 2: Payload CMS + SSR/ISR, третий Node-жилец Бокса Сабантуя (:3002).
// Прод-VPS (1.5 GiB RAM без swap) не тянет `next build` (OOM, G20) — сборка едет
// в CI, на сервер кладём standalone-артефакт.
//
// ⚠️ standalone-сборка мутирует локальный node_modules (outputFileTracing),
// поэтому включается ТОЛЬКО по флагу STANDALONE_BUILD=1 (его ставит deploy-prod.yml).
const nextConfig: NextConfig = {
  output: process.env.STANDALONE_BUILD === "1" ? "standalone" : undefined,
  trailingSlash: true, // URL-паритет с rmz43.ru (WordPress завершает всё «/»)
  reactStrictMode: true,
};

export default withPayload(nextConfig, { devBundleServerPackages: false });
