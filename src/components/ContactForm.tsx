"use client";

import { useEffect, useRef, useState } from "react";
import { SITE } from "@/lib/site";

/**
 * Стадия 2: заявка уходит в /api/zayavka (Payload, коллекция zayavki + email-дубль).
 * Антиспам: honeypot + Яндекс SmartCaptcha (виджет подключается, только если задан
 * NEXT_PUBLIC_SMARTCAPTCHA_KEY — до выдачи ключей владельцем форма работает без капчи).
 * При сетевой ошибке — fallback на mailto, чтобы заявка не потерялась.
 */

const CAPTCHA_KEY = process.env.NEXT_PUBLIC_SMARTCAPTCHA_KEY;

declare global {
  interface Window {
    smartCaptcha?: {
      render: (el: HTMLElement, opts: { sitekey: string; callback: (token: string) => void }) => number;
      reset: (id: number) => void;
    };
  }
}

export default function ContactForm({ subject = "Заявка с сайта" }: { subject?: string }) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
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
    try {
      const res = await fetch("/api/zayavka/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, contact, message, subject, website, smartToken }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setStatus("ok");
    } catch {
      setStatus("error");
    }
  };

  if (status === "ok") {
    return (
      <div className="rmz-form max-w-lg">
        <p className="font-semibold">Спасибо! Заявка отправлена.</p>
        <p className="text-sm text-neutral-600 mt-1">
          Менеджер отдела продаж свяжется с вами. Срочный вопрос — звоните {SITE.phones[0]}.
        </p>
      </div>
    );
  }

  return (
    <form className="rmz-form max-w-lg" onSubmit={submit}>
      <input required placeholder="Ваше имя" value={name} onChange={(e) => setName(e.target.value)} aria-label="Ваше имя" />
      <input required placeholder="Телефон или e-mail" value={contact} onChange={(e) => setContact(e.target.value)} aria-label="Телефон или e-mail" />
      <textarea rows={4} placeholder="Ваш вопрос или заказ" value={message} onChange={(e) => setMessage(e.target.value)} aria-label="Сообщение" />
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
      {CAPTCHA_KEY && <div ref={captchaRef} className="my-2" />}
      <button type="submit" disabled={status === "sending"}>
        {status === "sending" ? "Отправка…" : "Отправить"}
      </button>
      {status === "error" && (
        <p className="text-sm text-red-600 mt-2">
          Не получилось отправить. Попробуйте ещё раз, позвоните {SITE.phones[0]} или напишите на{" "}
          <a className="underline" href={`mailto:${SITE.emails.sales}?subject=${encodeURIComponent(subject)}`}>
            {SITE.emails.sales}
          </a>.
        </p>
      )}
      <p className="text-xs text-neutral-500 mt-2">
        Нажимая «Отправить», вы соглашаетесь на обработку персональных данных.
      </p>
    </form>
  );
}
