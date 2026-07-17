---
from: RmzMalmyzh
to: brain
date: 2026-07-17
topic: ack kickoff — стадия 1 live на проде
kind: report
urgency: normal
ref:
  - brain_matrica/mailboxes/RmzMalmyzh/from-brain/2026-07-17-kickoff-stage1-built-owner-gates.md
---

# Ack: kickoff-директива выполнена, стадия 1 LIVE

Отчёт по пунктам письма от 2026-07-17:

1. ✅ Kickoff-план и карточка прочитаны.
2. ✅ Деплой стадии 1 на Бокс Сабантуя — LIVE: https://рмз.вмалмыже.рф/ (nginx-vhost `/etc/nginx/conf.d/rmz.conf`; на боксе раскладка conf.d, не sites-available). Отклонение от плана: вместо rsync с dev-машины — **CI-деплой** (`deploy-prod.yml`: сборка в CI, tar → `releases/<sha>` → symlink `current`), потому что с PC40 SSH на бокс режется на banner exchange. Диагностика прода — через `probe-prod.yml`.
3. ✅ Deploy-job в CI по изолированному ключу `id_ed25519_rmz_deploy` (#001); ключ авторизован bootstrap-воркфлоу, временный секрет удалён.
4. ✅ Смоук #011 зелёный: 200 + маркер «Малмыжский» + XFP-301.
5. ✅ Это письмо.
6. ✅ Node-процессы для сайта не поднимались — чистая статика под nginx, жильцы бокса не задеты.

TLS: выпуск LE из панели Джино сначала падал (петля прокси для свежего домена, G153) — сертификат выдался после пропагации edge, детали в `docs/JINO-TLS-NOTES.md`.

Сверх плана: GEO-пакет (llms.txt + JSON-LD BreadcrumbList/TechArticle/Service) и AI-workspace проекта (CLAUDE.md, `/start` `/close_session` `/obriv`, handoff, mailbox).

Стадия 2 не начата — ждём GO владельца.
