"use client";

import Link from "next/link";
import { useState } from "react";
import { ECOSYSTEM, SITE } from "@/lib/site";

const NAV_V2 = [
  { label: "Двигатели", href: "/new/dvigateli/" },
  { label: "Как мы ремонтируем", href: "/new/#process" },
  { label: "Услуги", href: "/new/#uslugi" },
  { label: "Вакансии", href: "/new/vakansii/" },
  { label: "Новости", href: "/new/#novosti" },
  { label: "Вопросы", href: "/new/#faq" },
  { label: "Контакты", href: "/new/#kontakty" },
];

export default function HeaderV2() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[var(--v2-ink)]/90 backdrop-blur">
      <div className="v2-container flex items-center justify-between gap-4 py-3">
        <Link href="/new/" className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded bg-[var(--v2-accent)] text-lg font-black text-white">
            РМЗ
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-extrabold uppercase tracking-wide">Малмыжский ремзавод</span>
            <span className="block text-xs text-[var(--v2-muted)]">ремонт дизельных двигателей с 1931 года</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {NAV_V2.map((i) => (
            <Link key={i.href} href={i.href} className="text-sm font-medium text-white/80 hover:text-white">
              {i.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-4 lg:flex">
          <a
            href={ECOSYSTEM.servicesUrl}
            title={`${ECOSYSTEM.servicesLabel} — каталог сайтов города`}
            className="rounded border border-white/20 px-2 py-1 text-sm text-white/80 hover:border-white/50 hover:text-white"
          >
            🏛 {ECOSYSTEM.servicesLabel}
          </a>
          <a href={`tel:${SITE.phonesHref[0]}`} className="text-sm font-bold text-white hover:text-[var(--v2-accent)]">
            {SITE.phones[0]}
          </a>
          <Link href="/new/#zayavka" className="v2-btn !py-2 !px-4 text-sm">Заявка на ремонт</Link>
        </div>

        <button
          className="grid h-10 w-10 place-items-center rounded border border-white/20 lg:hidden"
          aria-label={open ? "Закрыть меню" : "Открыть меню"}
          onClick={() => setOpen(!open)}
        >
          <span className="text-xl leading-none">{open ? "✕" : "☰"}</span>
        </button>
      </div>

      {open && (
        <nav className="border-t border-white/10 bg-[var(--v2-steel)] lg:hidden">
          <div className="v2-container flex flex-col gap-1 py-3">
            {NAV_V2.map((i) => (
              <Link
                key={i.href}
                href={i.href}
                className="rounded px-2 py-2 font-medium text-white/85 hover:bg-white/5"
                onClick={() => setOpen(false)}
              >
                {i.label}
              </Link>
            ))}
            <a
              href={ECOSYSTEM.servicesUrl}
              className="rounded px-2 py-2 font-medium text-white/85 hover:bg-white/5"
              onClick={() => setOpen(false)}
            >
              🏛 {ECOSYSTEM.servicesLabel}
            </a>
            <a href={`tel:${SITE.phonesHref[0]}`} className="rounded px-2 py-2 font-bold">
              {SITE.phones[0]}
            </a>
            <Link href="/new/#zayavka" className="v2-btn mt-2 justify-center" onClick={() => setOpen(false)}>
              Заявка на ремонт
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
