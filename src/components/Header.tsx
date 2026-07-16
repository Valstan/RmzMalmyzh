"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { NAV, SITE } from "@/lib/site";

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="bg-white shadow-sm sticky top-0 z-40">
      {/* верхняя полоса с контактами — как на rmz43.ru */}
      <div className="bg-neutral-800 text-neutral-200 text-sm">
        <div className="mx-auto max-w-6xl px-4 py-1.5 flex flex-wrap gap-x-6 gap-y-1 justify-between">
          <span>Работаем со всеми регионами России</span>
          <span className="flex flex-wrap gap-x-4">
            <a href={`tel:${SITE.phonesHref[0]}`} className="hover:text-white">{SITE.phones[0]}</a>
            <a href={`mailto:${SITE.emails.sales}`} className="hover:text-white">{SITE.emails.sales}</a>
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3 py-2 shrink-0">
          <Image src="/images/logo.png" alt={SITE.name} width={200} height={69} priority />
        </Link>

        {/* десктоп-меню */}
        <nav className="hidden lg:block" aria-label="Главное меню">
          <ul className="flex items-center">
            {NAV.map((item) => (
              <li key={item.href} className="relative group">
                <Link
                  href={item.href}
                  className="block px-3 py-5 font-bold text-[14px] uppercase tracking-wide hover:text-[var(--accent)]"
                >
                  {item.label}
                </Link>
                {item.children && (
                  <ul className="absolute left-0 top-full hidden group-hover:block bg-white shadow-lg min-w-64 border-t-2 border-[var(--accent)] z-50">
                    {item.children.map((c) => (
                      <li key={c.href}>
                        <Link href={c.href} className="block px-4 py-2.5 text-sm hover:bg-neutral-100 hover:text-[var(--accent)]">
                          {c.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
            <li>
              <Link href="/kontakty/#zakaz" className="btn ml-3 !py-2">Сделать заказ</Link>
            </li>
          </ul>
        </nav>

        {/* мобильный бургер */}
        <button
          className="lg:hidden p-2"
          aria-label={open ? "Закрыть меню" : "Открыть меню"}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <span className="block w-6 h-0.5 bg-black mb-1.5" />
          <span className="block w-6 h-0.5 bg-black mb-1.5" />
          <span className="block w-6 h-0.5 bg-black" />
        </button>
      </div>

      {open && (
        <nav className="lg:hidden border-t bg-white max-h-[70vh] overflow-y-auto" aria-label="Мобильное меню">
          <ul className="px-4 py-2">
            {NAV.map((item) => (
              <li key={item.href} className="border-b border-neutral-100 last:border-0">
                <Link href={item.href} className="block py-3 font-bold" onClick={() => setOpen(false)}>
                  {item.label}
                </Link>
                {item.children && (
                  <ul className="pb-2">
                    {item.children.map((c) => (
                      <li key={c.href}>
                        <Link href={c.href} className="block py-1.5 pl-4 text-sm text-neutral-700" onClick={() => setOpen(false)}>
                          {c.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
            <li className="py-3">
              <Link href="/kontakty/#zakaz" className="btn" onClick={() => setOpen(false)}>Сделать заказ</Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
