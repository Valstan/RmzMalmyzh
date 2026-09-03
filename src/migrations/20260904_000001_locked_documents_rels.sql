-- Миграция 20260904_000001 — достроить payload_locked_documents_rels под новые коллекции.
--
-- ЧТО СЛОМАЛОСЬ. Миграция 20260823_000001 создала таблицы коллекций `novosti` и
-- `rubriki`, но не тронула СУЩЕСТВУЮЩУЮ служебную таблицу блокировок документов:
-- Payload держит в `payload_locked_documents_rels` по колонке `<коллекция>_id` на
-- каждую коллекцию конфига. После применения на проде остались 7 старых колонок
-- вместо 9.
--
-- Админка берёт блокировку при открытии ЛЮБОГО документа, а запрос перечисляет все
-- коллекции разом, поэтому падало не «редактирование новости», а редактирование
-- вообще: `/admin/account/`, страницы, заявки — всё отдавало «Application error»
-- (в журнале: `column …novosti_id does not exist`). Списки и дашборд работали, потому
-- что блокировку не берут — оттого поломка и выглядела выборочной.
--
-- ПОЧЕМУ ПРОСКОЧИЛО. Заготовку DDL снимает `dump-schema.yml` по РЕГУЛЯРКЕ ИМЁН ТАБЛИЦ
-- (`novosti|rubriki`) — правка существующей таблицы в выборку не попадала by design.
-- Дальше весь файл обёрнут в `IF NOT EXISTS`, и `CREATE TABLE IF NOT EXISTS
-- payload_locked_documents_rels` на проде стал тихим no-op. Приёмка сравнивала только
-- СПИСОК ТАБЛИЦ, а он не менялся. Это класс G231 (ручная зеркальная миграция теряет
-- колонки существующих таблиц): применяется чисто, роняет 500 первым запросом.
-- Контрмеры в том же PR: снимок схемы теперь по паре «таблица.колонка», а в
-- `probe-prod.yml` появилась проверка дрейфа.
--
-- Имена колонок, индексов и внешних ключей сняты с эталонной схемы
-- (`dump-schema.yml`, прогон 33797832306), а не придуманы.
BEGIN;

ALTER TABLE public.payload_locked_documents_rels ADD COLUMN IF NOT EXISTS novosti_id integer;
ALTER TABLE public.payload_locked_documents_rels ADD COLUMN IF NOT EXISTS rubriki_id integer;

CREATE INDEX IF NOT EXISTS payload_locked_documents_rels_novosti_id_idx
    ON public.payload_locked_documents_rels USING btree (novosti_id);
CREATE INDEX IF NOT EXISTS payload_locked_documents_rels_rubriki_id_idx
    ON public.payload_locked_documents_rels USING btree (rubriki_id);

-- ADD CONSTRAINT IF NOT EXISTS в Postgres нет — ловим дубль исключением, как и
-- CREATE TYPE в предыдущей миграции. ON DELETE CASCADE обязателен: без него
-- удаление новости упрётся во внешний ключ висящей блокировки.
DO $$ BEGIN
    ALTER TABLE ONLY public.payload_locked_documents_rels
        ADD CONSTRAINT payload_locked_documents_rels_novosti_fk
        FOREIGN KEY (novosti_id) REFERENCES public.novosti(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE ONLY public.payload_locked_documents_rels
        ADD CONSTRAINT payload_locked_documents_rels_rubriki_fk
        FOREIGN KEY (rubriki_id) REFERENCES public.rubriki(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMIT;
