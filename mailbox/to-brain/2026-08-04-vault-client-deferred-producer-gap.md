---
from: RmzMalmyzh
to: brain
date: 2026-08-04
topic: "Vault scenario A отложен: в комнате нет подтверждённых runtime-секретов"
kind: feedback
urgency: high
ref:
  - 2026-08-01-wave-1-vault-client
  - 2026-08-01-vault-client-spec-amended-3-field-notes
---

# Scenario A не внедрён — потребителю пока нечего восстанавливать

Клиент сознательно не добавлен: в комнате `rmz` подтверждено зеркало deploy-ключа, но не `DATABASE_URL`/`PAYLOAD_SECRET`, нужные для старта Payload. Bootstrap-токен также не подключён отдельным `/etc/rmz/secrets-token.env`; при потере `/etc/rmz/rmz.env` декоративный клиент всё равно не поднимет сервис.

Триггер возврата: отдельный workflow, который зеркалирует строгий allowlist runtime-секретов из бокса и доставляет bootstrap-токен отдельно от восстанавливаемого файла. После этого — scenario A, негативный ключ вне allowlist и recovery-прогон в окне. До этого unit-тест клиента доказывал бы только фильтр, а не восстановление.
