import Link from "next/link";
import OrderFormV2 from "@/components/v2/OrderFormV2";
import { getFaq, getPosts } from "@/lib/cms";
import { SITE } from "@/lib/site";
import { ENGINE_GROUPS, OTHER_SERVICES, PROCESS_STEPS, V2_STATS } from "@/lib/v2/catalog";

// Данные — из той же Payload-БД, что и основной сайт (новости, FAQ).
// Только рантайм: CI собирает с пустой БД, поэтому статический пререндер запёк бы
// пустую страницу и отдавал её до первой ревалидации — час после каждого деплоя.
// Вторая причина — ссылки /media/<id>/… привязаны к конкретной базе, так что
// пререндер на сборочной БД был бы не устаревшим, а прямо неверным.
export const dynamic = "force-dynamic";

export default async function V2Home() {
  const [posts, faq] = await Promise.all([getPosts(), getFaq()]);
  const news = posts.slice(0, 3);
  const topFaq = faq.slice(0, 5);

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden border-b border-white/10"
        style={{
          backgroundImage:
            "linear-gradient(100deg, rgba(18,20,26,0.96) 35%, rgba(18,20,26,0.6)), url(/images/slides/slide-1.webp)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="v2-container py-24 md:py-32">
          <p className="v2-label">Завод в Малмыже · вся Россия</p>
          <h1 className="mt-4 max-w-3xl text-4xl md:text-6xl">
            Капитальный ремонт дизельных двигателей{" "}
            <span className="text-[var(--v2-accent)]">со стендовыми испытаниями</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-white/75">
            Д6, Д12, ЯМЗ, КамАЗ, судовые и тепловозные дизели. Полная дефектовка, согласованная смета,
            обкатка под нагрузкой — двигатель возвращается с паспортом ремонта и гарантией.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="#zayavka" className="v2-btn">Отправить двигатель в ремонт</Link>
            <Link href="/new/dvigateli/" className="v2-btn-ghost">Каталог двигателей</Link>
          </div>
        </div>
      </section>

      {/* ── Цифры ────────────────────────────────────────────── */}
      <section className="border-b border-white/10 bg-[var(--v2-steel)]">
        <div className="v2-container grid grid-cols-2 gap-8 py-10 md:grid-cols-4">
          {V2_STATS.map((s) => (
            <div key={s.label}>
              <p className="text-3xl font-extrabold text-[var(--v2-accent)] md:text-4xl">{s.value}</p>
              <p className="mt-1 text-sm text-[var(--v2-muted)]">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Каталог двигателей (тизер) ───────────────────────── */}
      <section className="v2-container py-20" id="dvigateli">
        <p className="v2-label">Каталог</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-3xl md:text-4xl">Какие двигатели ремонтируем</h2>
          <Link href="/new/dvigateli/" className="font-semibold text-[var(--v2-accent)] hover:underline">
            Все модели →
          </Link>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {ENGINE_GROUPS.map((g) => (
            <Link key={g.slug} href={`/new/dvigateli/#${g.slug}`} className="v2-card block">
              <h3 className="text-xl">{g.title}</h3>
              <p className="mt-2 text-sm text-[var(--v2-muted)]">{g.applications}</p>
              <p className="mt-4 flex flex-wrap gap-2">
                {g.models.slice(0, 4).map((m) => (
                  <span key={m.model} className="v2-chip">{m.model}</span>
                ))}
                {g.models.length > 4 && <span className="v2-chip">ещё {g.models.length - 4}</span>}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Процесс ──────────────────────────────────────────── */}
      <section className="border-y border-white/10 bg-[var(--v2-steel)]" id="process">
        <div className="v2-container py-20">
          <p className="v2-label">Производство</p>
          <h2 className="mt-3 max-w-2xl text-3xl md:text-4xl">Как проходит ремонт — 7 этапов, как в цехе</h2>
          <p className="mt-4 max-w-2xl text-white/70">
            Каждый двигатель проходит одинаковый производственный маршрут. Работы начинаются только после
            согласования дефектовочной ведомости и сметы — без скрытых доплат.
          </p>
          <ol className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {PROCESS_STEPS.map((s) => (
              <li key={s.n} className="v2-card">
                <p className="text-3xl font-black text-[var(--v2-accent)]">{String(s.n).padStart(2, "0")}</p>
                <h3 className="mt-2 text-lg">{s.title}</h3>
                <p className="mt-2 text-sm text-[var(--v2-muted)]">{s.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Услуги и продукция ───────────────────────────────── */}
      <section className="v2-container py-20" id="uslugi">
        <p className="v2-label">Услуги и продукция</p>
        <h2 className="mt-3 text-3xl md:text-4xl">Не только двигатели</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {OTHER_SERVICES.map((s) => (
            <Link key={s.path} href={s.path} className="v2-card block">
              <h3 className="text-lg">{s.title}</h3>
              <p className="mt-2 text-sm text-[var(--v2-muted)]">{s.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Новости ──────────────────────────────────────────── */}
      {news.length > 0 && (
        <section className="border-y border-white/10 bg-[var(--v2-steel)]" id="novosti">
          <div className="v2-container py-20">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="v2-label">Новости и статьи</p>
                <h2 className="mt-3 text-3xl md:text-4xl">Что нового на заводе</h2>
              </div>
              <Link href="/novosti/" className="font-semibold text-[var(--v2-accent)] hover:underline">
                Все новости →
              </Link>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {news.map((p) => (
                <Link key={p.id} href={p.path} className="v2-card block">
                  {p.publishedAt && (
                    <p className="text-xs text-[var(--v2-muted)]">
                      {new Date(p.publishedAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  )}
                  <h3 className="mt-2 text-lg leading-snug">{p.h1}</h3>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FAQ ──────────────────────────────────────────────── */}
      {topFaq.length > 0 && (
        <section className="v2-container py-20" id="faq">
          <p className="v2-label">Вопросы и ответы</p>
          <h2 className="mt-3 text-3xl md:text-4xl">Частые вопросы заказчиков</h2>
          <div className="mt-10 max-w-3xl space-y-3">
            {topFaq.map((f) => (
              <details key={f.id} className="v2-card !p-0">
                <summary className="cursor-pointer list-none px-6 py-4 text-lg font-bold marker:content-none">
                  {f.question}
                </summary>
                <div className="border-t border-white/10 px-6 py-4 text-white/75">{f.answer}</div>
              </details>
            ))}
          </div>
          <Link href="/voprosy-i-otvety/" className="mt-6 inline-block font-semibold text-[var(--v2-accent)] hover:underline">
            Все вопросы и ответы →
          </Link>
        </section>
      )}

      {/* ── Заявка ───────────────────────────────────────────── */}
      <section className="border-t border-white/10 bg-[var(--v2-steel)]" id="zayavka">
        <div className="v2-container grid gap-12 py-20 lg:grid-cols-2">
          <div>
            <p className="v2-label">Заявка</p>
            <h2 className="mt-3 text-3xl md:text-4xl">Отправьте двигатель в ремонт</h2>
            <p className="mt-4 text-white/70">
              Опишите задачу — менеджер отдела продаж перезвонит, поможет с доставкой из любого региона
              и подготовит смету после дефектовки.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-white/80">
              <li>✔ Ответ в рабочее время — в течение дня</li>
              <li>✔ Смета только после дефектовки, работы — после вашего согласования</li>
              <li>✔ Гарантия на выполненный ремонт</li>
            </ul>
            <p className="mt-8 text-sm text-[var(--v2-muted)]">
              Быстрее по телефону:{" "}
              <a href={`tel:${SITE.phonesHref[0]}`} className="font-bold text-white">{SITE.phones[0]}</a>
            </p>
          </div>
          <OrderFormV2 />
        </div>
      </section>
    </>
  );
}
