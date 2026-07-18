import type { Metadata } from "next";
import Link from "next/link";
import { ENGINE_GROUPS } from "@/lib/v2/catalog";

export const metadata: Metadata = {
  title: "Каталог двигателей в ремонт",
  description:
    "Полный список моделей дизельных двигателей, которые ремонтирует Малмыжский ремзавод: Д6, Д12, ЯМЗ, КамАЗ, судовые, тепловозные, тракторные.",
};

export default function EnginesCatalog() {
  return (
    <div className="v2-container py-16">
      <nav aria-label="Хлебные крошки" className="text-sm text-[var(--v2-muted)]">
        <Link href="/new/" className="hover:text-white">Главная</Link>
        <span className="mx-2">/</span>
        <span>Каталог двигателей</span>
      </nav>

      <p className="v2-label mt-8">Каталог</p>
      <h1 className="mt-3 text-4xl md:text-5xl">Двигатели, которые мы ремонтируем</h1>
      <p className="mt-4 max-w-2xl text-white/70">
        По каждой модели — отдельная страница с составом работ. Не нашли свою модель?{" "}
        <Link href="/new/#zayavka" className="font-semibold text-[var(--v2-accent)] hover:underline">
          Напишите нам
        </Link>{" "}
        — ассортимент ремонтируемых серий постоянно расширяется.
      </p>

      {/* Быстрая навигация по группам */}
      <div className="mt-8 flex flex-wrap gap-2">
        {ENGINE_GROUPS.map((g) => (
          <a key={g.slug} href={`#${g.slug}`} className="v2-chip">{g.title}</a>
        ))}
      </div>

      <div className="mt-14 space-y-16">
        {ENGINE_GROUPS.map((g) => (
          <section key={g.slug} id={g.slug} className="scroll-mt-24">
            <h2 className="text-2xl md:text-3xl">{g.title}</h2>
            <p className="mt-2 max-w-2xl text-white/70">{g.intro}</p>
            <p className="mt-1 text-sm text-[var(--v2-muted)]">Применение: {g.applications}</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {g.models.map((m) => (
                <Link key={m.path} href={m.path} className="v2-card block !p-4">
                  <p className="font-bold">{m.model}</p>
                  <p className="mt-1 text-sm text-[var(--v2-accent)]">Состав работ →</p>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-20 rounded-xl border border-[var(--v2-accent)]/40 bg-[var(--v2-steel)] p-8 text-center">
        <h2 className="text-2xl">Готовы отправить двигатель в ремонт?</h2>
        <p className="mx-auto mt-2 max-w-xl text-white/70">
          Поможем с доставкой из любого региона России. Смета — после дефектовки, работы — после вашего согласования.
        </p>
        <Link href="/new/#zayavka" className="v2-btn mt-6">Оставить заявку</Link>
      </div>
    </div>
  );
}
