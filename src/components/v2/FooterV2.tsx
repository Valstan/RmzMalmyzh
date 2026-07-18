import Link from "next/link";
import { SITE } from "@/lib/site";

export default function FooterV2() {
  return (
    <footer className="border-t border-white/10 bg-[var(--v2-steel)]" id="kontakty">
      <div className="v2-container grid gap-10 py-14 md:grid-cols-3">
        <div>
          <p className="text-lg font-extrabold">{SITE.name}</p>
          <p className="mt-3 text-sm text-[var(--v2-muted)]">{SITE.address}</p>
          <p className="mt-1 text-sm text-[var(--v2-muted)]">Работаем со всеми регионами России. Год основания — {SITE.foundingYear}.</p>
        </div>
        <div>
          <p className="v2-label">Контакты</p>
          <ul className="mt-3 space-y-2 text-sm">
            {SITE.phones.map((p, i) => (
              <li key={p}>
                <a href={`tel:${SITE.phonesHref[i]}`} className="font-bold hover:text-[var(--v2-accent)]">{p}</a>
              </li>
            ))}
            <li>Отдел сбыта: <a href={`mailto:${SITE.emails.sales}`} className="underline hover:text-[var(--v2-accent)]">{SITE.emails.sales}</a></li>
            <li>Приёмная: <a href={`mailto:${SITE.emails.office}`} className="underline hover:text-[var(--v2-accent)]">{SITE.emails.office}</a></li>
            <li>Тендерный отдел: <a href={`mailto:${SITE.emails.tender}`} className="underline hover:text-[var(--v2-accent)]">{SITE.emails.tender}</a></li>
          </ul>
        </div>
        <div>
          <p className="v2-label">Разделы</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/new/dvigateli/" className="hover:text-[var(--v2-accent)]">Каталог двигателей</Link></li>
            <li><Link href="/new/#process" className="hover:text-[var(--v2-accent)]">Как мы ремонтируем</Link></li>
            <li><Link href="/new/#zayavka" className="hover:text-[var(--v2-accent)]">Заявка на ремонт</Link></li>
            <li><Link href="/zakupki/" className="hover:text-[var(--v2-accent)]">Закупки</Link></li>
            <li><Link href="/vakansii/" className="hover:text-[var(--v2-accent)]">Вакансии</Link></li>
            <li><Link href="/" className="text-[var(--v2-muted)] hover:text-white">← Текущая версия сайта</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-[var(--v2-muted)]">
        © {new Date().getFullYear()} {SITE.name} · Предпросмотр нового сайта
      </div>
    </footer>
  );
}
