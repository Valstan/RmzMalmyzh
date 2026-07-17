# CLAUDE.md — entry point для AI-сессий «RmzMalmyzh»

Первый файл, который Claude читает в новой сессии проекта. Подсказывает, **где взять контекст** и **как правильно работать**.

Проект — новый сайт АО «Малмыжский завод по ремонту дизельных двигателей» (замена rmz43.ru на WordPress). Проект экосистемы brain_matrica. Kickoff-план: [`../brain_matrica/docs/plans/rmz-site-kickoff.md`](../brain_matrica/docs/plans/rmz-site-kickoff.md), карточка: [`../brain_matrica/projects/RmzMalmyzh.md`](../brain_matrica/projects/RmzMalmyzh.md).

## Быстрые факты

- **Прод (стадия 1):** https://рмз.вмалмыже.рф/ — статическая копия rmz43.ru (128 страниц, URL-паритет 1:1), LIVE на Боксе Сабантуя, nginx, TLS есть.
- **Стек:** Next.js 15 App Router + TS + Tailwind 4, pnpm, `output: 'export'` → `out/`. Никаких Node-процессов на боксе.
- **Стадия 2** (Payload CMS, новый UI, бэкенд форм) — **только после явного GO владельца**.
- Контент-конвейер: `pnpm parse-mirror` → `content/pages.json`, `pnpm fetch-images` (повторный харвест rmz43.ru).
- План улучшений и аудит: `docs/AUDIT-rmz43.md`.

## Гейты и деплой

- Гейты перед PR: `corepack pnpm lint && corepack pnpm build`.
- Мерж в `main` → **авто-деплой на прод** (`deploy-prod.yml`: сборка в CI, tar → releases → symlink) + смоук #011 (200 + маркер «Малмыжский» + XFP-301).
- ⚠️ С dev-машины PC40 SSH на бокс режется на banner exchange — вся диагностика прода **только через Actions** (`probe-prod.yml`).
- PR-flow: ветка → PR → показать diff → **OK владельца** → squash-merge. Прямых пушей в `main` нет.

## 📬 Mailbox check — ДО любой другой работы (ADR-0001 v3)

Асимметричные mailbox'ы: каждая сторона пишет только в свой репо.

| Направление | Кто пишет | Где |
|---|---|---|
| `brain → RmzMalmyzh` | brain | `../brain_matrica/mailboxes/RmzMalmyzh/from-brain/*.md` (мы только **читаем** после `git pull --ff-only`) |
| `RmzMalmyzh → brain` | мы | **`mailbox/to-brain/*.md`** в этом репо (через PR) |

Сканить только корень `from-brain/` (не `DRAFTS/`, не `ARCHIVE/`). Compliance: `mandate`→MUST (применить или feedback-письмо с блокером), `recommend`→SHOULD (применить или обоснованный отказ письмом), `suggest`→MAY. Письма без `compliance`: `directive`→MUST, `idea`→SHOULD. ❌ Никогда не писать/коммитить в `../brain_matrica/`.

Формат исходящего письма `mailbox/to-brain/YYYY-MM-DD-slug.md`:

```yaml
---
from: RmzMalmyzh
to: brain
date: YYYY-MM-DD
topic: ...
kind: idea | question | feedback | report
compliance: suggest | recommend | mandate   # для kind=idea
urgency: low | normal | high
---
```

## Session-память

- `docs/SESSION_HANDOFF.md` — статус/нитка/следующий шаг (обновляет `/close_session`, читает `/start`).
- `docs/PENDING_FOLLOWUPS.md` — отложенные пункты с decay-триажем (#033).

## Команды

- `/start` — синхра + mailbox-check + handoff.
- `/close_session` — сохранить состояние, всё на origin через PR.
- `/obriv` — восстановление после обрыва связи.
