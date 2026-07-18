import type { Metadata } from "next";
import Link from "next/link";
import ResumeWizard from "@/components/v2/ResumeWizard";
import { HR_PHONES, HR_PHONES_HREF, VACANCIES } from "@/lib/v2/vacancy";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Вакансии — работа на заводе",
  description:
    "Работа на Малмыжском ремзаводе: токари, фрезеровщики, операторы ЧПУ, слесари МСР, инженеры ОТК. Заполните анкету прямо на сайте.",
};

export default function VacanciesPage() {
  const openVacancies = VACANCIES.slice(0, -1); // без пункта «Другая профессия»
  return (
    <div className="v2-container py-16">
      <nav aria-label="Хлебные крошки" className="text-sm text-[var(--v2-muted)]">
        <Link href="/new/" className="hover:text-white">Главная</Link>
        <span className="mx-2">/</span>
        <span>Вакансии</span>
      </nav>

      <p className="v2-label mt-8">Работа на заводе</p>
      <h1 className="mt-3 text-4xl md:text-5xl">Приходите работать на ремзавод</h1>
      <p className="mt-4 max-w-2xl text-white/70">
        Заводу в Малмыже нужны рабочие руки и инженерные головы. Официальное трудоустройство,
        стабильная зарплата, работа на настоящем производстве с 90-летней историей.
      </p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <h2 className="text-xl font-extrabold">Открытые вакансии</h2>
          <ul className="mt-4 space-y-2">
            {openVacancies.map((v) => (
              <li key={v} className="v2-chip !block !w-fit">{v}</li>
            ))}
          </ul>
          <div className="mt-8 rounded-lg border border-white/10 bg-[var(--v2-steel)] p-5 text-sm">
            <p className="font-bold">Отдел кадров</p>
            <p className="mt-2 text-[var(--v2-muted)]">г. Малмыж, ул. Дружбы, 2</p>
            <p className="mt-1">
              {HR_PHONES.map((p, i) => (
                <a key={p} href={`tel:${HR_PHONES_HREF[i]}`} className="mr-4 font-bold hover:text-[var(--v2-accent)]">{p}</a>
              ))}
            </p>
            <p className="mt-1">
              <a href={`mailto:${SITE.emails.office}`} className="underline hover:text-[var(--v2-accent)]">{SITE.emails.office}</a>
            </p>
          </div>
          <p className="mt-6 text-sm text-[var(--v2-muted)]">
            Анкета занимает 3–5 минут. Необязательные вопросы можно пропускать — отдел кадров уточнит
            детали на собеседовании. Если укажете e-mail, копия анкеты придёт и вам.
          </p>
        </div>

        <div id="anketa">
          <ResumeWizard />
        </div>
      </div>
    </div>
  );
}
