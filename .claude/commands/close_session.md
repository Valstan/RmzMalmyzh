---
description: Закрыть сессию — сохранить состояние в SESSION_HANDOFF и запушить всё через PR-flow, чтобы продолжить без потерь на другой машине
---

# /close_session — финализация сессии «RmzMalmyzh»

Цель: оставить **explicit pointer** «куда мы шли» в `docs/SESSION_HANDOFF.md` и убедиться, что **всё лежит на `origin`** (handoff + рабочие PR), а brain не тронут — чтобы на другом компьютере хватило `/start` + `git pull --ff-only`.

## Когда вызывать / когда НЕ вызывать

- ✅ В конце рабочей сессии; перед пересадкой на другую машину; после значимого куска (фича/доки/решение).
- ❌ После короткой консультации без правок — просто скажи, что состояние чистое.

## Шаг 1. Собрать контекст

```bash
git branch --show-current
git status --short
git log --oneline -10
gh pr list --state open
```
Плюс прочитать текущий `docs/SESSION_HANDOFF.md` — что было в начале.

## Шаг 2. Уточнить у пользователя (если развилка)

- Какая нитка активна для **следующей** сессии и что считать «следующим шагом»?
- Появились ли новые решения/ограничения, которых нет в коде/гите (→ в handoff)?

## Шаг 3. Незакоммиченная работа → через PR-flow (НЕ в `main` напрямую)

Если `git status` непустой помимо handoff/доков:
1. **Гейты** (если трогался код): `corepack pnpm lint && corepack pnpm typecheck && corepack pnpm build`. С стадии 2 сборка требует Postgres (`.env`, см. `.env.example`) — Payload лезет в БД на пререндере.
2. **NUL-чек** (грабля харнесса): `git add -A && git diff --cached --stat` — любой исходник как `Bin` → вычистить NUL и пересохранить UTF-8 (см. `/obriv` шаг 3).
3. Ветка `feat/ fix/ chore/ docs/ refactor/` → коммит → `git push -u origin <ветка>` → `gh pr create` → CI зелёный → **авто-мерж** `gh pr merge --squash --delete-branch` (mandate #027: гейты вместо «окей», см. `AGENTS.md`).
   - ⚠️ Мерж в `main` **авто-деплоит на прод** (`deploy-prod.yml`, Бокс Сабантуя) со смоуком #011. После мержа проверить, что смоук зелёный.
   - ⚠️ С этой машины (PC40) SSH на бокс режется на banner exchange — вся диагностика прода только через Actions (`probe-prod.yml`).

## Шаг 4. Обновить живой бэклог `docs/AUDIT-rmz43.md`

Если двигались пункты плана улучшений (SEO/GEO/UX) — отметить статус: ☐ идея · ◐ в работе · ✅ на проде (+ № PR).

## Шаг 4.5. Шеринг находки в brain (условный, pool #009)

Был **переносимый** инсайт (новый паттерн / обход бага / security-приём)? 3-фильтр: значимость / переносимость / неочевидность.
- Да → создать `mailbox/to-brain/YYYY-MM-DD-slug.md` (`kind: idea|feedback`, `compliance`, `urgency`) **в этом репо**.
- ❌ Никогда не писать/коммитить в `../brain_matrica/` (read-only). **Тишина = норма**.

## Шаг 5. Записать `docs/SESSION_HANDOFF.md`

Обновить ключевые секции (абсолютные даты, не «вчера»):
- **Статус** — одна-две строки: что свежее, что на проде.
- **Сделано** — новый пункт сессии (что/как/гейты/прод-смоук).
- **Следующий шаг** — конкретный кандидат.
- **Открытые вопросы для владельца** — если появились.

## Шаг 6. Закоммитить handoff через docs-PR и смержить с OK

```bash
git checkout -b docs/handoff-<slug>
git add docs/SESSION_HANDOFF.md
git commit -m "docs: handoff — <короткое резюме>"
git push -u origin docs/handoff-<slug>
gh pr create ...
# показать diff → OK → gh pr merge --squash --delete-branch
git checkout main && git pull --ff-only
```
ℹ️ docs-мерж деплой НЕ триггерит: в `deploy-prod.yml` стоит `paths-ignore` для `docs/**`, `**.md`, `.claude/**`. Деплой (и ожидание смоука) — только при изменении кода/конфигов сборки.

## Шаг 7. Sync-гейт (жёсткий)

```bash
git status --short                 # пусто
git rev-parse HEAD @{u}            # совпадают → main == origin/main
gh pr list --state open            # перечислить
cd ../brain_matrica && git status --short && cd -   # чисто
```

## Шаг 8. Отчёт пользователю

- Что закрыто в сессии (1–2 строки).
- Handoff обновлён ✅, всё на `origin` ✅, brain read-only ✅, прод-смоук после мержа ✅.
- Открытые PR (ждут OK) — список.
- Что подхватит `/start` на другой машине.

## Что НЕ делать

- ❌ `git push origin main` напрямую; `--force` / `reset --hard` по `main`.
- ❌ Авто-мерж PR без явного **OK на diff**.
- ❌ Писать/коммитить в `../brain_matrica/`.
- ❌ Оставлять незапушенные ветки/коммиты или висящий `git stash`.
- ❌ Поднимать на боксе **лишние** Node-процессы: у сайта ровно один сервис `rmz` (:3002, `MemoryMax=512M`) — третий жилец рядом с `sabantuy` (:3000) и `kazanskaya` (:3001) на 1.5 ГиБ без swap.
