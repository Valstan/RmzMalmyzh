import Link from "next/link";
import { SITE } from "@/lib/site";

export default function Footer() {
  return (
    <footer className="bg-neutral-900 text-neutral-300 mt-16">
      <div className="mx-auto max-w-6xl px-4 py-10 grid gap-8 md:grid-cols-3 text-sm">
        <div>
          <h3 className="text-white font-bold mb-3">{SITE.name}</h3>
          <p>{SITE.address}</p>
          <p className="mt-2">Работаем со всеми регионами России. Год основания — {SITE.foundingYear}.</p>
        </div>
        <div>
          <h3 className="text-white font-bold mb-3">Контакты</h3>
          <ul className="space-y-1.5">
            {SITE.phones.map((p, i) => (
              <li key={p}><a href={`tel:${SITE.phonesHref[i]}`} className="hover:text-white">{p}</a></li>
            ))}
            <li>Отдел сбыта: <a href={`mailto:${SITE.emails.sales}`} className="hover:text-white">{SITE.emails.sales}</a></li>
            <li>Приёмная: <a href={`mailto:${SITE.emails.office}`} className="hover:text-white">{SITE.emails.office}</a></li>
            <li>Тендерный отдел: <a href={`mailto:${SITE.emails.tender}`} className="hover:text-white">{SITE.emails.tender}</a></li>
          </ul>
        </div>
        <div>
          <h3 className="text-white font-bold mb-3">Информация</h3>
          <ul className="space-y-1.5">
            <li><Link href="/voprosy-i-otvety/" className="hover:text-white">Вопросы и ответы</Link></li>
            <li><Link href="/raskrytie-informacii/" className="hover:text-white">Раскрытие информации</Link></li>
            <li><Link href="/tekhnicheskaya-informaciya/" className="hover:text-white">Техническая информация</Link></li>
            <li><Link href="/privacy-policy/" className="hover:text-white">Политика конфиденциальности</Link></li>
            <li><Link href="/soglasie-polzovatelya-na-obrabotku-personalnyh-dannyh/" className="hover:text-white">Согласие на обработку ПДн</Link></li>
            <li><Link href="/informirovanie-ob-ispolzovanii-yandeks-metriki/" className="hover:text-white">Об использовании Яндекс Метрики</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-neutral-700">
        <div className="mx-auto max-w-6xl px-4 py-4 text-xs text-neutral-400">
          © {new Date().getFullYear()} {SITE.name}
        </div>
      </div>
    </footer>
  );
}
