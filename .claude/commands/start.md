---
description: Старт сессии — синхра репо (#032) + mailbox-check от brain + чтение SESSION_HANDOFF + re-триаж PENDING (#033)
---

Выполни старт сессии «RmzMalmyzh» строго по шагам (детали — в `AGENTS.md` §📬 Mailbox check). Порядок жёсткий: **сначала синхронизация (шаги 1–2), потом чтение session-памяти (шаги 5–6)** — pool #032.

1. **Sync свой репо — ПЕРВЫМ:** `git fetch`; если working tree чист и есть отставание — `git checkout main && git pull --ff-only`. Незакоммиченное / не-ff — сообщи и не форсируй. Только после этого можно доверять `SESSION_HANDOFF`/`PENDING`.
2. **Brain и соседние репо не синхронизировать:** никаких `fetch`/`pull`/`checkout` в `../brain_matrica/` — там может идти чужая работа с незапушенной почтой (`AGENTS.md` §🚫).
3. **Скан входящих — два канала:** локально корень `../brain_matrica/mailboxes/RmzMalmyzh/from-brain/*.md` (НЕ `DRAFTS/`, НЕ `ARCHIVE/`) **плюс** GitHub: `gh api "repos/Valstan/brain_matrica/contents/mailboxes/RmzMalmyzh/from-brain?ref=main" --jq '.[] | select(.type=="file") | .name'`. Набор писем = объединение; письмо, которого нет локально, читать через `gh api … --jq .content | base64 -d`; одноимённое письмо с разным содержимым → прочитать обе версии, доложить конфликт, ничего не перезаписывать.
4. **Доложи** пользователю сводку писем ДО чтения handoff, в формате:
   ```
   📬 N писем от brain_matrica:
   - [urgency COMPLIANCE] YYYY-MM-DD-slug — тема
   ```
   `urgency: high` — выдели отдельно даже если письмо одно. Для писем без `compliance`: `kind: directive`→MUST, `kind: idea`→SHOULD.
5. **Прочитай** `docs/SESSION_HANDOFF.md` — статус, текущая нитка, следующий шаг. Если `Updated:` старше 14 дней — пометь «handoff может быть неактуален», не доверяй слепо.
6. **Re-триаж отложенного (#033):** прочитай `docs/PENDING_FOLLOWUPS.md`; пункты с возрастом `added` > 30 дней ИЛИ `snoozed` ≥ 3× — **всплыви пользователю** с тремя исходами: возобновить / переформулировать под текущий код / выкинуть (с причиной). Остальные пункты не перечисляй. Каждое осознанное «потом» по всплывшему пункту — инкремент `snoozed` + обновление `last-touch`.
7. **Сводка main:** `git log --oneline -5` и `git status` — что нового, есть ли незакоммиченное.
8. Кратко предложи пользователю следующий шаг из handoff.

Не начинай правки кода до завершения шагов 1–5.
