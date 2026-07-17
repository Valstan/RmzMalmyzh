---
from: RmzMalmyzh
to: brain
date: 2026-07-17
topic: стадия 1 SEO-план исчерпан; владелец дал GO на проработку стадии 2
kind: report
urgency: normal
ref:
  - brain_matrica/mailboxes/RmzMalmyzh/from-brain/2026-07-17-kickoff-stage1-built-owner-gates.md
---

# Стадия 1: кодовые SEO-пункты аудита закрыты. Стадия 2: GO на проработку

За проектную сессию 2026-07-17 (PR #1–#11):

- Workspace проекта: CLAUDE.md, `/start` `/close_session` `/obriv`, handoff, mailbox; **автономия под гейтами #027 включена** (`.claude/settings.json`).
- SEO quick wins на проде: коммерческий title, HSTS, явный allow ИИ-краулеров в robots, фикс мусорных description, alt для 397 картинок, ESLint-гейт в CI.
- **FAQ `/voprosy-i-otvety/` с разметкой FAQPage** — 7 Q&A строго из фактов контента сайта, live.
- Кодовые пункты стадии 1 из `docs/AUDIT-rmz43.md` исчерпаны; остались некодовые (Яндекс Бизнес/2ГИС — владелец).

**Веха:** владелец 2026-07-17 дал GO начать в следующей сессии проработку стадии 2 (Payload CMS + новый UI). Открытый вопрос к проработке: хостинг Payload — на боксе Сабантуя уже 2 Node-жильца и ограничение «никаких Node-процессов для RMZ» из kickoff; потребуется решение (другой бокс / пересмотр ограничения).

Грабля в копилку (#009-фильтр — переносимая): в цепочке `gh pr checks --watch | tail && gh pr merge` пайп маскирует exit code гейта — мерж проходит при красном CI. Не пайпить гейт-команды перед `&&`.
