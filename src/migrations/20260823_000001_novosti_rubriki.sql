-- Миграция 20260823_000001 — коллекции novosti и rubriki (лента заводских новостей).
--
-- ЧТО ЭТО. Первая миграция схемы в истории проекта. DDL снят с ЖИВОЙ эфемерной базы
-- воркфлоу dump-schema.yml (прогон 32601616817), а не написан руками: на PC40 нет ни
-- Postgres, ни Docker, и ошибка в типе колонки обнаружилась бы уже на проде.
--
-- ПОЧЕМУ СЫРОЙ SQL, А НЕ `payload migrate`. Схема прода родилась не миграцией, а
-- через pushSchema → pg_dump → restore (setup-prod-stage2.yml). После pushSchema Payload
-- пишет в payload_migrations строку `dev` с batch = -1, и штатный `payload migrate`,
-- увидев её, задаёт ИНТЕРАКТИВНЫЙ вопрос про потерю данных. На раннере без TTY он на
-- этом вопросе тихо выходит с кодом 0, не применив ничего — то есть «зелёный прогон»
-- означал бы «не сделано», а не «сделано».
--
-- ИДЕМПОТЕНТНОСТЬ. Всё обёрнуто в IF NOT EXISTS и DO-блоки с перехватом
-- duplicate_object: повторный прогон безопасен. ADD CONSTRAINT в Postgres не имеет
-- формы IF NOT EXISTS — отсюда DO-блоки.
--
-- ⚠️ ТИПЫ ИДУТ ПЕРВЫМИ И НЕ СЛУЧАЙНО. `pg_dump -t` выгружает таблицы, но НЕ типы:
-- в дампе стоит `source public.enum_novosti_source`, а CREATE TYPE отсутствует.
-- Миграция без этого блока прошла бы чтение глазами и упала на проде. Наступили
-- 2026-08-23 на первой же коллекции с полем select; dump-schema.yml с тех пор
-- печатает типы всегда.
--
-- ВНЕШНИЕ КЛЮЧИ ведут только в media (уже есть на проде) и в создаваемые здесь
-- таблицы — существующие таблицы эта миграция не трогает вовсе.
--
-- ПРИМЕНЕНИЕ: только через apply-migration.yml (dispatch, pg_dump до первой записи),
-- ДО мержа кода коллекций — иначе прод получит код, ждущий таблиц, которых нет.

BEGIN;

DO $$ BEGIN
    CREATE TYPE public.enum__novosti_v_version_source AS ENUM ('vk', 'ruchnaya', 'legacy');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE TYPE public.enum__novosti_v_version_status AS ENUM ('draft', 'published');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE TYPE public.enum_novosti_source AS ENUM ('vk', 'ruchnaya', 'legacy');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE TYPE public.enum_novosti_status AS ENUM ('draft', 'published');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

--
--

--
-- Name: _novosti_v; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public._novosti_v (
    id integer NOT NULL,
    parent_id integer,
    version_title character varying,
    version_slug character varying,
    version_published_at timestamp(3) with time zone,
    version_excerpt character varying,
    version_body character varying,
    version_rubrika_id integer,
    version_cover_id integer,
    version_source public.enum__novosti_v_version_source DEFAULT 'ruchnaya'::public.enum__novosti_v_version_source,
    version_vk_post_id character varying,
    version_vk_url character varying,
    version_legacy_path character varying,
    version_updated_at timestamp(3) with time zone,
    version_created_at timestamp(3) with time zone,
    version__status public.enum__novosti_v_version_status DEFAULT 'draft'::public.enum__novosti_v_version_status,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    latest boolean
);

--
-- Name: _novosti_v_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public._novosti_v_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: _novosti_v_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public._novosti_v_id_seq OWNED BY public._novosti_v.id;

--
-- Name: _novosti_v_version_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public._novosti_v_version_images (
    _order integer NOT NULL,
    _parent_id integer NOT NULL,
    id integer NOT NULL,
    image_id integer,
    _uuid character varying
);

--
-- Name: _novosti_v_version_images_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public._novosti_v_version_images_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: _novosti_v_version_images_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public._novosti_v_version_images_id_seq OWNED BY public._novosti_v_version_images.id;

--
-- Name: novosti; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.novosti (
    id integer NOT NULL,
    title character varying,
    slug character varying,
    published_at timestamp(3) with time zone,
    excerpt character varying,
    body character varying,
    rubrika_id integer,
    cover_id integer,
    source public.enum_novosti_source DEFAULT 'ruchnaya'::public.enum_novosti_source,
    vk_post_id character varying,
    vk_url character varying,
    legacy_path character varying,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    _status public.enum_novosti_status DEFAULT 'draft'::public.enum_novosti_status
);

--
-- Name: novosti_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.novosti_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: novosti_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.novosti_id_seq OWNED BY public.novosti.id;

--
-- Name: novosti_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.novosti_images (
    _order integer NOT NULL,
    _parent_id integer NOT NULL,
    id character varying NOT NULL,
    image_id integer
);

--
-- Name: rubriki; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.rubriki (
    id integer NOT NULL,
    name character varying NOT NULL,
    slug character varying,
    description character varying,
    "order" numeric DEFAULT 0,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL
);

--
-- Name: rubriki_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.rubriki_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: rubriki_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rubriki_id_seq OWNED BY public.rubriki.id;

--
-- Name: _novosti_v id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._novosti_v ALTER COLUMN id SET DEFAULT nextval('public._novosti_v_id_seq'::regclass);

--
-- Name: _novosti_v_version_images id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._novosti_v_version_images ALTER COLUMN id SET DEFAULT nextval('public._novosti_v_version_images_id_seq'::regclass);

--
-- Name: novosti id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.novosti ALTER COLUMN id SET DEFAULT nextval('public.novosti_id_seq'::regclass);

--
-- Name: rubriki id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rubriki ALTER COLUMN id SET DEFAULT nextval('public.rubriki_id_seq'::regclass);

--
-- Name: _novosti_v _novosti_v_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    ALTER TABLE ONLY public._novosti_v
        ADD CONSTRAINT _novosti_v_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

--
-- Name: _novosti_v_version_images _novosti_v_version_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    ALTER TABLE ONLY public._novosti_v_version_images
        ADD CONSTRAINT _novosti_v_version_images_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

--
-- Name: novosti_images novosti_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    ALTER TABLE ONLY public.novosti_images
        ADD CONSTRAINT novosti_images_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

--
-- Name: novosti novosti_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    ALTER TABLE ONLY public.novosti
        ADD CONSTRAINT novosti_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

--
-- Name: rubriki rubriki_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    ALTER TABLE ONLY public.rubriki
        ADD CONSTRAINT rubriki_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

--
-- Name: _novosti_v_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS _novosti_v_created_at_idx ON public._novosti_v USING btree (created_at);

--
-- Name: _novosti_v_latest_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS _novosti_v_latest_idx ON public._novosti_v USING btree (latest);

--
-- Name: _novosti_v_parent_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS _novosti_v_parent_idx ON public._novosti_v USING btree (parent_id);

--
-- Name: _novosti_v_updated_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS _novosti_v_updated_at_idx ON public._novosti_v USING btree (updated_at);

--
-- Name: _novosti_v_version_images_image_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS _novosti_v_version_images_image_idx ON public._novosti_v_version_images USING btree (image_id);

--
-- Name: _novosti_v_version_images_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS _novosti_v_version_images_order_idx ON public._novosti_v_version_images USING btree (_order);

--
-- Name: _novosti_v_version_images_parent_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS _novosti_v_version_images_parent_id_idx ON public._novosti_v_version_images USING btree (_parent_id);

--
-- Name: _novosti_v_version_version__status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS _novosti_v_version_version__status_idx ON public._novosti_v USING btree (version__status);

--
-- Name: _novosti_v_version_version_cover_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS _novosti_v_version_version_cover_idx ON public._novosti_v USING btree (version_cover_id);

--
-- Name: _novosti_v_version_version_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS _novosti_v_version_version_created_at_idx ON public._novosti_v USING btree (version_created_at);

--
-- Name: _novosti_v_version_version_legacy_path_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS _novosti_v_version_version_legacy_path_idx ON public._novosti_v USING btree (version_legacy_path);

--
-- Name: _novosti_v_version_version_published_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS _novosti_v_version_version_published_at_idx ON public._novosti_v USING btree (version_published_at);

--
-- Name: _novosti_v_version_version_rubrika_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS _novosti_v_version_version_rubrika_idx ON public._novosti_v USING btree (version_rubrika_id);

--
-- Name: _novosti_v_version_version_slug_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS _novosti_v_version_version_slug_idx ON public._novosti_v USING btree (version_slug);

--
-- Name: _novosti_v_version_version_updated_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS _novosti_v_version_version_updated_at_idx ON public._novosti_v USING btree (version_updated_at);

--
-- Name: _novosti_v_version_version_vk_post_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS _novosti_v_version_version_vk_post_id_idx ON public._novosti_v USING btree (version_vk_post_id);

--
-- Name: novosti__status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS novosti__status_idx ON public.novosti USING btree (_status);

--
-- Name: novosti_cover_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS novosti_cover_idx ON public.novosti USING btree (cover_id);

--
-- Name: novosti_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS novosti_created_at_idx ON public.novosti USING btree (created_at);

--
-- Name: novosti_images_image_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS novosti_images_image_idx ON public.novosti_images USING btree (image_id);

--
-- Name: novosti_images_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS novosti_images_order_idx ON public.novosti_images USING btree (_order);

--
-- Name: novosti_images_parent_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS novosti_images_parent_id_idx ON public.novosti_images USING btree (_parent_id);

--
-- Name: novosti_legacy_path_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS novosti_legacy_path_idx ON public.novosti USING btree (legacy_path);

--
-- Name: novosti_published_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS novosti_published_at_idx ON public.novosti USING btree (published_at);

--
-- Name: novosti_rubrika_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS novosti_rubrika_idx ON public.novosti USING btree (rubrika_id);

--
-- Name: novosti_slug_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS novosti_slug_idx ON public.novosti USING btree (slug);

--
-- Name: novosti_updated_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS novosti_updated_at_idx ON public.novosti USING btree (updated_at);

--
-- Name: novosti_vk_post_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS novosti_vk_post_id_idx ON public.novosti USING btree (vk_post_id);

--
-- Name: rubriki_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS rubriki_created_at_idx ON public.rubriki USING btree (created_at);

--
-- Name: rubriki_slug_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS rubriki_slug_idx ON public.rubriki USING btree (slug);

--
-- Name: rubriki_updated_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS rubriki_updated_at_idx ON public.rubriki USING btree (updated_at);

--
-- Name: _novosti_v _novosti_v_parent_id_novosti_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    ALTER TABLE ONLY public._novosti_v
        ADD CONSTRAINT _novosti_v_parent_id_novosti_id_fk FOREIGN KEY (parent_id) REFERENCES public.novosti(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

--
-- Name: _novosti_v _novosti_v_version_cover_id_media_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    ALTER TABLE ONLY public._novosti_v
        ADD CONSTRAINT _novosti_v_version_cover_id_media_id_fk FOREIGN KEY (version_cover_id) REFERENCES public.media(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

--
-- Name: _novosti_v_version_images _novosti_v_version_images_image_id_media_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    ALTER TABLE ONLY public._novosti_v_version_images
        ADD CONSTRAINT _novosti_v_version_images_image_id_media_id_fk FOREIGN KEY (image_id) REFERENCES public.media(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

--
-- Name: _novosti_v_version_images _novosti_v_version_images_parent_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    ALTER TABLE ONLY public._novosti_v_version_images
        ADD CONSTRAINT _novosti_v_version_images_parent_id_fk FOREIGN KEY (_parent_id) REFERENCES public._novosti_v(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

--
-- Name: _novosti_v _novosti_v_version_rubrika_id_rubriki_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    ALTER TABLE ONLY public._novosti_v
        ADD CONSTRAINT _novosti_v_version_rubrika_id_rubriki_id_fk FOREIGN KEY (version_rubrika_id) REFERENCES public.rubriki(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

--
-- Name: novosti novosti_cover_id_media_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    ALTER TABLE ONLY public.novosti
        ADD CONSTRAINT novosti_cover_id_media_id_fk FOREIGN KEY (cover_id) REFERENCES public.media(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

--
-- Name: novosti_images novosti_images_image_id_media_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    ALTER TABLE ONLY public.novosti_images
        ADD CONSTRAINT novosti_images_image_id_media_id_fk FOREIGN KEY (image_id) REFERENCES public.media(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

--
-- Name: novosti_images novosti_images_parent_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    ALTER TABLE ONLY public.novosti_images
        ADD CONSTRAINT novosti_images_parent_id_fk FOREIGN KEY (_parent_id) REFERENCES public.novosti(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

--
-- Name: novosti novosti_rubrika_id_rubriki_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    ALTER TABLE ONLY public.novosti
        ADD CONSTRAINT novosti_rubrika_id_rubriki_id_fk FOREIGN KEY (rubrika_id) REFERENCES public.rubriki(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

--
--

COMMIT;
