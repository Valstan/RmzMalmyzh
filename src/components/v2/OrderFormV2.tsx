"use client";

import { useEffect, useRef, useState } from "react";
import { SITE } from "@/lib/site";

/**
 * Расширенная заявка v2: тип работ + модель двигателя (структура — из практики
 * приёмки в цехах / МатрицаРМЗ). Уходит в тот же /api/zayavka (коллекция
 * zayavki): модель и тип работ упаковываются в subject/message — без изменений
 * схемы Payload. Антиспам как в ContactForm: honeypot + SmartCaptcha по ключу.
 */

const CAPTCHA_KEY = process.env.NEXT_PUBLIC_SMARTCAPTCHA_KEY;

const WORK_TYPES = [
  "Капитальный ремонт двигателя",
  "Дефектовка / диагностика",
  "Ремонт реверс-редуктора",
  "Ремонт гидропередачи",
  "Механическая обработка",
  "Литьё по чертежам",
  "Запчасти",
  "Другое",
];

declare global {
  interface Window {
    smartCaptcha?: {
      render: (el: HTMLElement, opts: { sitekey: string; callback: (token: string) => void }) => number;
      reset: (id: number) => void;
    };
  }
}

export default function OrderFormV2() {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [workType, setWorkType] = useState(WORK_TYPES[0]);
  const [model, setModel] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [smartToken, setSmartToken] = useState("");
  const captchaRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<number | null>(null);

  useEffect(() => {
    if (!CAPTCHA_KEY || !captchaRef.current || widgetId.current !== null) return;
    const render = () => {
      if (window.smartCaptcha && captchaRef.current && widgetId.current === null) {
        widgetId.current = window.smartCaptcha.render(captchaRef.current, {
          sitekey: CAPTCHA_KEY,
          callback: setSmartToken,
        });
      }
    };
    if (window.smartCaptcha) {
      render();
      return;
    }
    const s = document.createElement("script");
    s.src = "https://smartcaptcha.yandexcloud.net/captcha.js?render=onload";
    s.async = true;
    s.onload = render;
    document.head.appendChild(s);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    const subject = `Заявка (новый сайт): ${workType}${model ? ` — ${model}` : ""}`;
    const fullMessage = [`Тип работ: ${workType}`, model ? `Модель/агрегат: ${model}` : "", message]
      .filter(Boolean)
      .join("\n");
    try {
      const res = await fetch("/api/zayavka/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, contact, message: fullMessage, subject, website, smartToken }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setStatus("ok");
    } catch {
      setStatus("error");
    }
  };

  if (status === "ok") {
    return (
      <div className="v2-card">
        <p className="text-lg font-bold">Спасибо! Заявка отправлена.</p>
        <p className="mt-2 text-sm text-[var(--v2-muted)]">
          Менеджер отдела продаж свяжется с вами и согласует доставку двигателя. Срочный вопрос — звоните{" "}
          <a href={`tel:${SITE.phonesHref[0]}`} className="font-bold text-white">{SITE.phones[0]}</a>.
        </p>
      </div>
    );
  }

  return (
    <form className="v2-form" onSubmit={submit}>
      <div className="grid gap-x-4 md:grid-cols-2">
        <input required placeholder="Ваше имя" value={name} onChange={(e) => setName(e.target.value)} aria-label="Ваше имя" />
        <input required placeholder="Телефон или e-mail" value={contact} onChange={(e) => setContact(e.target.value)} aria-label="Телефон или e-mail" />
        <select value={workType} onChange={(e) => setWorkType(e.target.value)} aria-label="Тип работ">
          {WORK_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <input placeholder="Модель двигателя / агрегата (например, ЯМЗ-238)" value={model} onChange={(e) => setModel(e.target.value)} aria-label="Модель двигателя" />
      </div>
      <textarea rows={4} placeholder="Опишите задачу: состояние двигателя, сроки, откуда доставка" value={message} onChange={(e) => setMessage(e.target.value)} aria-label="Сообщение" />
      {/* honeypot: скрыт от людей, боты заполняют */}
      <input
        type="text"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", height: 0, width: 0, opacity: 0 }}
        placeholder="Ваш сайт"
      />
      {CAPTCHA_KEY && <div ref={captchaRef} className="my-3" />}
      <button type="submit" className="v2-btn w-full justify-center md:w-auto" disabled={status === "sending"}>
        {status === "sending" ? "Отправка…" : "Отправить заявку"}
      </button>
      {status === "error" && (
        <p className="mt-3 text-sm text-red-400">
          Не получилось отправить. Попробуйте ещё раз, позвоните {SITE.phones[0]} или напишите на{" "}
          <a className="underline" href={`mailto:${SITE.emails.sales}`}>{SITE.emails.sales}</a>.
        </p>
      )}
      <p className="mt-3 text-xs text-[var(--v2-muted)]">Нажимая «Отправить заявку», вы соглашаетесь на обработку персональных данных.</p>
    </form>
  );
}
