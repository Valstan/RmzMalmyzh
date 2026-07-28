# CLAUDE.md — entry point для AI-сессий «RmzMalmyzh»

Первый файл, который Claude читает в новой сессии проекта. Подсказывает, **где взять контекст** и **как правильно работать**.

Проект — новый сайт АО «Малмыжский завод по ремонту дизельных двигателей» (замена rmz43.ru на WordPress). Проект экосистемы brain_matrica. Kickoff-план: [`../brain_matrica/docs/plans/rmz-site-kickoff.md`](../brain_matrica/docs/plans/rmz-site-kickoff.md), карточка: [`../brain_matrica/projects/RmzMalmyzh.md`](../brain_matrica/projects/RmzMalmyzh.md).

## Быстрые факты

- **Прод:** https://рмз.вмалмыже.рф/ — Бокс Сабантуя, nginx, TLS есть. Стадия 2: Next standalone + Payload, **третий Node-жилец** (:3002, systemd `rmz`, MemoryMax=512M) рядом с Sabantuy (:3000) и Kazanskaya (:3001).
- **Стек:** Next.js 15 App Router + TS + Tailwind 4 + **Payload 3.75 + PostgreSQL** (стандарт экосистемы, образец — KazanskayaMalmyzh), pnpm, standalone-сборка в CI по флагу `STANDALONE_BUILD=1`.
- **Контент:** 128 страниц стадии 1 живут в Payload (коллекция `pages`, HTML-поле) + `faq` + `zayavki` (формы). Правки — в `/admin`. Сид: `src/seed/seedFromStage1.ts`.
- **GO владельца на стадию 2 получен 2026-07-17** (третий жилец на том же боксе, решение владельца).
- Контент-конвейер: `pnpm parse-mirror` → `content/pages.json`, `pnpm fetch-images` (повторный харвест rmz43.ru).
- **Картинки контента → Медиа** (аудит §4.2): `corepack pnpm payload run src/seed/mediaFromContent.ts` — dry-run, `APPLY=1` применяет. Импортирует 180 харвест-файлов из `public/images/wp/**` в коллекцию `media` **1:1** (варианты размеров WP не схлопываем в оригинал: 34 из 76 — реальные кропы, до 51% разницы аспекта) и переводит 521 ссылку контента на `/media/<id>/<имя>` — URL по **номеру записи**, поэтому замена файла в админке не ломает ссылки. Идемпотентно; статика `public/images/wp/**` остаётся исходником импорта и страховкой. Гейт — job `media-import` в CI (полный прогон на эфемерной БД + живая выдача картинки через `next start`): локально проверить нельзя, на PC40 нет ни Postgres, ни Docker. Применение на проде — отдельный шаг, **ДО него pg_dump** (правка контента 128 страниц необратима без бэкапа, #025).
- **Каталог сервисов Малмыжа** (постулат 37): мы записаны в `вход.вмалмыже.рф/services`, кнопка «Сервисы Малмыжа» — в шапке и подвале обоих интерфейсов (`ECOSYSTEM` в `src/lib/site.ts`, URL строго punycode — G133/G134). Пользовательского входа у нас нет → требование «авторизация только через ЕСА» n/a до первого посетительского аккаунта; админка Payload — вход персонала, под требование не попадает.
- План улучшений и аудит: `docs/AUDIT-rmz43.md`.

## Гейты и деплой

- Гейты перед PR: `corepack pnpm lint && corepack pnpm typecheck && corepack pnpm build` (build требует локальный Postgres — `.env.example`).
- Мерж в `main` → **авто-деплой на прод** (`deploy-prod.yml`: standalone-сборка в CI с эфемерным Postgres, tar → releases → symlink → `systemctl restart rmz`) + смоук #011 (Node :3002 → 200, маркер «Малмыжский», /admin, XFP-301).
- Первичная подготовка бокса — `setup-prod-stage2.yml` (dispatch: БД+роль, /etc/rmz/rmz.env, юнит, restore сида, админ). Будущие миграции схемы — вручную ДО деплоя (guard #017), паттерн apply-migration Сабантуя.
- **Миграции Payload/Drizzle — правило снапшота (G192).** `migrations/` у нас ещё нет; при первой миграции сразу заводим порядок: **`.json`-снапшот коммитится вместе с каждой миграцией** (без снапшота Drizzle считает БД пустой и генерирует правдоподобный `down()` с `DROP TABLE ... CASCADE` по всем таблицам), `down()` читается глазами до применения, `up()` прогоняется на чистой БД. Первый `migrate:create` даёт полную схему законно — опасен второй. Заодно: env-файл прода `/etc/rmz/rmz.env` имеет права 600 root — читать в воркфлоу только через `sudo -n` (у вМалмыже голый `grep` уронил `apply-migration.yml`).
- ⚠️ С dev-машины PC40 SSH на бокс режется на banner exchange — вся диагностика прода **только через Actions** (`probe-prod.yml`).
- PR-flow: ветка → PR → squash-merge. Прямых пушей в `main` нет.

### Автономия под гейтами — авто-мерж без человеческого «окей» (cross-project mandate #027)

Владелец убрал ритуал «окей на дифф/мерж/деплой»: подтверждение **заменено автоматическими гейтами**. Механизм — коммитимый `.claude/settings.json` (`defaultMode: auto` + allow/deny). Ярусно по риску:

| Операция | Режим | Гейт = подтверждение |
|---|---|---|
| Правки файлов, ветка, коммит, push ветки, PR, **авто-мерж** | **авто** | `corepack pnpm build` зелёный (build = typecheck + статический экспорт) **и** CI зелёный |
| **Деплой на прод** (авто-триггер от merge; для docs/`.claude` не срабатывает — `paths-ignore`) | **авто** | смоук #011 в воркфлоу (200 + маркер + XFP-301); после деплоя дождаться зелёного |
| `probe-prod.yml` (read-only диагностика) | **авто** | — |
| `apply-authorize-key.yml` (SSH-ключи бокса) | **`ask`** | человек сверяет |
| Необратимые операции с прод-данными/инфрой вне воркфлоу | **подтверждать** (#025) | черта не пересекается |

Обязанности: красный гейт → НЕ мержить, чинить; после merge ждать единственный авто-деплой (`concurrency: deploy-prod`); зелёный пайплайн ≠ корректный результат — по возможности глянуть прод глазами (#011).

**deny (жёсткий блок):** прямой/force push в `main`.

## 🚫 Чужие репо — строго read-only (ADR-0009, постулат 35)

Решение владельца 2026-07-18, симметрично для всех проектов экосистемы: **подсматривать можно — трогать нельзя.**

- **Читать** код, доки и почту любого sibling-репо (`../brain_matrica/`, `../SabantuyMalmyzh/`, `../KazanskayaMalmyzh/`, любой другой) — можно и нужно (ADR-0007, тактические чтения).
- ❌ **Не изменять, не создавать, не удалять, не коммитить, не двигать** файлы и git-состояние **никакого** чужого репо: ни `git add/commit/push`, ни `checkout`/`pull`/`stash`, ни правки файлов. Прецедент — 07-17/18 сессии brain и RmzMalmyzh дважды пытались коммитить каталоги друг друга.
- **Услуги соседей — только через опубликованные интерфейсы** (реестр: `../brain_matrica/access/INDEX.md` §5): vault KARMAN по API, VK-контент через шлюз SARAFAN, авторизация посетителей — ЕСА `вход.вмалмыже.рф`. Чужой репо — подсказка, а не место исполнения.
- Наш собственный канал наружу — только `mailbox/to-brain/` в этом репо (см. ниже).

## 📬 Mailbox check — ДО любой другой работы (ADR-0001 v3)

Асимметричные mailbox'ы: каждая сторона пишет только в свой репо.

| Направление | Кто пишет | Где |
|---|---|---|
| `brain → RmzMalmyzh` | brain | `../brain_matrica/mailboxes/RmzMalmyzh/from-brain/*.md` (мы только **читаем** после `git pull --ff-only`) |
| `RmzMalmyzh → brain` | мы | **`mailbox/to-brain/*.md`** в этом репо (через PR) |

Сканить только корень `from-brain/` (не `DRAFTS/`, не `ARCHIVE/`). Compliance: `mandate`→MUST (применить или feedback-письмо с блокером), `recommend`→SHOULD (применить или обоснованный отказ письмом), `suggest`→MAY. Письма без `compliance`: `directive`→MUST, `idea`→SHOULD. ❌ Никогда не писать/коммитить в `../brain_matrica/` — частный случай ADR-0009 (см. выше).

Молчание в ответ на письмо brain обязан читать как «не дошло» и эскалировать (постулат 38). Поэтому осознанное «потом» тоже оформляется письмом в три строки: что прочитано, почему отложено, триггер возврата.

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
