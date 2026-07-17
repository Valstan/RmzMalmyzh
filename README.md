# RmzMalmyzh — сайт АО «Малмыжский завод по ремонту дизельных двигателей»

Новая версия сайта завода (сейчас — https://rmz43.ru/ на WordPress). Проект экосистемы brain_matrica.

- **Прод (стадия 1):** https://рмз.вмалмыже.рф/ (punycode `xn--g1ajl.xn--80adkdyec4j.xn--p1ai`) — статическая копия текущего сайта
- **Стек:** Next.js 15 (App Router) + TypeScript + Tailwind CSS 4, pnpm; стадия 1 — `output: 'export'` (статика, отдаётся nginx с Бокса 1 без Node-процесса)
- **Стадия 2 (план):** новый UI + Payload CMS + реальный бэкенд форм — стандартный стек экосистемы (= GONBA/Sabantuy)
- **Аудит исходного сайта и план улучшений:** [docs/AUDIT-rmz43.md](docs/AUDIT-rmz43.md)

## Как устроена копия (стадия 1)

Контент rmz43.ru (128 страниц: 86 pages + 42 поста) снят зеркалом и распарсен в `content/pages.json`:

1. Зеркало: PowerShell качает все URL из sitemap в `mirror/` (в репо не коммитится).
2. `pnpm parse-mirror <путь-к-mirror>` → `content/pages.json` + `content/images-manifest.json` (cheerio: чистка WPBakery, формы → слоты, картинки → `/images/wp/…`).
3. `pnpm fetch-images` → скачивает картинки в `public/images/wp/`.
4. Маршруты: `/` — главная (слайдер + контент), `/novosti/` — генерируемый листинг постов, всё остальное — catch-all `[...slug]` из `pages.json`. URL-паритет с rmz43.ru 1:1 (`trailingSlash`).

Формы: стадия 1 без бэкенда — submit собирает mailto на отдел сбыта. Стадия 2 заменит на серверный обработчик.

## Разработка

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm build      # статический экспорт в out/
```

## Деплой

- ✅ **LIVE на Боксе Сабантуя** (`1942c6fc87be.vps.myjino.ru`, IP `81.177.141.140`, SSH :49338): CI-деплой `deploy-prod.yml` — сборка в CI (G20), tar → releases/<sha> → symlink `current`, nginx-vhost `/etc/nginx/conf.d/rmz.conf` (раскладка бокса — conf.d, не sites-available), смоук #011 (200 + маркер + XFP-301).
- Деплой-ключ: изолированный `id_ed25519_rmz_deploy` (#001) — приватная часть в `secrets.SSH_PRIVATE_KEY` + машина владельца (`~/.ssh/`, host-алиас `rmz`); авторизован на боксе bootstrap-воркфлоу, временный секрет удалён. ⚠️ С dev-машины PC40 SSH на бокс режется на banner exchange — все операции через Actions (probe-prod.yml).
- DNS: ✅ `рмз` + `*.рмз` → A `81.177.141.140` (панель Джино, привязка VPS «Сабантуй Малмыж»), консистентно на ns1-3 + 8.8.8.8.
- TLS: ⏳ выпуск LE из панели Джино пока падает — **петля прокси для свежего домена**, см. [docs/JINO-TLS-NOTES.md](docs/JINO-TLS-NOTES.md); повторять «Установить» в панели (SSL-вкладка домена).

## Экосистема

Метаданные и стратегия — в `../brain_matrica/` (карточка `projects/RmzMalmyzh.md`, kickoff в `docs/plans/`). Почта brain ↔ project: `../brain_matrica/mailboxes/RmzMalmyzh/`.
