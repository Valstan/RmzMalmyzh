import type { NextConfig } from "next";

// Стадия 1 — статическая копия rmz43.ru: output:'export' отдаётся nginx'ом с
// Бокса 1 без Node-процесса (RAM бокса впритык). При переходе к стадии 2
// (Payload CMS, формы) экспорт заменяется на output:'standalone'.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true, // URL-паритет с rmz43.ru (WordPress завершает всё «/»)
  images: { unoptimized: true },
};

export default nextConfig;
