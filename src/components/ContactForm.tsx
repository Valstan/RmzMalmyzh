"use client";

import { useState } from "react";
import { SITE } from "@/lib/site";

/**
 * Стадия 1 (статическая копия): отправка формы собирает mailto-письмо в отдел
 * сбыта — серверного обработчика ещё нет. Стадия 2 заменит на реальный
 * backend (см. docs/AUDIT-rmz43.md, раздел «Формы»).
 */
export default function ContactForm({ subject = "Заявка с сайта" }: { subject?: string }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const body = `Имя: ${name}\nТелефон: ${phone}\n\n${message}`;
    window.location.href = `mailto:${SITE.emails.sales}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <form className="rmz-form max-w-lg" onSubmit={submit}>
      <input required placeholder="Ваше имя" value={name} onChange={(e) => setName(e.target.value)} aria-label="Ваше имя" />
      <input required placeholder="Телефон или e-mail" value={phone} onChange={(e) => setPhone(e.target.value)} aria-label="Телефон или e-mail" />
      <textarea rows={4} placeholder="Ваш вопрос или заказ" value={message} onChange={(e) => setMessage(e.target.value)} aria-label="Сообщение" />
      <button type="submit">Отправить</button>
      <p className="text-xs text-neutral-500 mt-2">
        Нажимая «Отправить», вы соглашаетесь на обработку персональных данных.
      </p>
    </form>
  );
}
