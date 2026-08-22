"use client";

import { useEffect, useRef, useState } from "react";
import { SITE } from "@/lib/site";
import {
  EDUCATION_LEVELS,
  EXPERIENCE_YEARS,
  SALARY_OPTIONS,
  SKIPPED,
  START_OPTIONS,
  VACANCIES,
} from "@/lib/v2/vacancy";

/**
 * Каскадная анкета соискателя: один вопрос — один экран, назад/далее,
 * необязательные вопросы можно пропустить (в анкету пишется «— не указано —»).
 * Отправка → /api/rezyume: письмо в приёмную + копия соискателю на e-mail.
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

type Answers = {
  vacancy: string;
  vacancyCustom: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  birth: string;
  eduLevel: string;
  eduPlace: string;
  expYears: string;
  expLast: string;
  skills: string;
  salary: string;
  start: string;
  freeText: string;
};

const EMPTY: Answers = {
  vacancy: "",
  vacancyCustom: "",
  name: "",
  phone: "",
  email: "",
  city: "",
  birth: "",
  eduLevel: "",
  eduPlace: "",
  expYears: "",
  expLast: "",
  skills: "",
  salary: "",
  start: "",
  freeText: "",
};

const or = (v: string) => v.trim() || SKIPPED;

export default function ResumeWizard() {
  const [a, setA] = useState<Answers>(EMPTY);
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [website, setWebsite] = useState(""); // honeypot
  const [smartToken, setSmartToken] = useState("");
  const captchaRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<number | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const set = (patch: Partial<Answers>) => setA((prev) => ({ ...prev, ...patch }));

  const vacancyFinal =
    a.vacancy === VACANCIES[VACANCIES.length - 1] ? a.vacancyCustom.trim() || "Другая профессия" : a.vacancy;

  /* Шаги: title, подсказка, поля, обязательность. Пропуск = пустые значения. */
  const steps: {
    key: string;
    title: string;
    hint?: string;
    required?: boolean;
    valid?: () => boolean;
    body: React.ReactNode;
  }[] = [
    {
      key: "vacancy",
      title: "На какую вакансию вы откликаетесь?",
      hint: "Список актуальных вакансий завода. Если вашей профессии нет — выберите последний пункт и напишите её сами.",
      required: true,
      valid: () => !!a.vacancy && (a.vacancy !== VACANCIES[VACANCIES.length - 1] || !!a.vacancyCustom.trim()),
      body: (
        <>
          <select value={a.vacancy} onChange={(e) => set({ vacancy: e.target.value })} aria-label="Вакансия">
            <option value="" disabled>Выберите вакансию…</option>
            {VACANCIES.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
          {a.vacancy === VACANCIES[VACANCIES.length - 1] && (
            <input
              placeholder="Напишите вашу профессию"
              value={a.vacancyCustom}
              onChange={(e) => set({ vacancyCustom: e.target.value })}
              aria-label="Ваша профессия"
            />
          )}
        </>
      ),
    },
    {
      key: "name",
      title: "Как вас зовут?",
      hint: "Фамилия, имя и отчество — как в паспорте.",
      required: true,
      valid: () => a.name.trim().length >= 3,
      body: (
        <input placeholder="Фамилия Имя Отчество" value={a.name} onChange={(e) => set({ name: e.target.value })} aria-label="ФИО" />
      ),
    },
    {
      key: "contacts",
      title: "Как с вами связаться?",
      hint: "Телефон обязателен — по нему перезвонит отдел кадров. E-mail не обязателен, но на него придёт копия вашей анкеты.",
      required: true,
      valid: () => a.phone.trim().length >= 6,
      body: (
        <>
          <input type="tel" placeholder="Телефон, например +7 912 345-67-89" value={a.phone} onChange={(e) => set({ phone: e.target.value })} aria-label="Телефон" />
          <input type="email" placeholder="E-mail (не обязательно — для копии анкеты)" value={a.email} onChange={(e) => set({ email: e.target.value })} aria-label="E-mail" />
        </>
      ),
    },
    {
      key: "city",
      title: "Где вы живёте?",
      hint: "Город или посёлок. Заводу важно понимать, как вы будете добираться.",
      body: (
        <input placeholder="Например: Малмыж, Вятские Поляны…" value={a.city} onChange={(e) => set({ city: e.target.value })} aria-label="Город" />
      ),
    },
    {
      key: "birth",
      title: "Дата рождения",
      hint: "Нужна отделу кадров для оформления. Можно пропустить и назвать на собеседовании.",
      body: <input type="date" value={a.birth} onChange={(e) => set({ birth: e.target.value })} aria-label="Дата рождения" />,
    },
    {
      key: "edu",
      title: "Ваше образование",
      hint: "Уровень и, если помните, учебное заведение и специальность.",
      body: (
        <>
          <select value={a.eduLevel} onChange={(e) => set({ eduLevel: e.target.value })} aria-label="Уровень образования">
            <option value="">Выберите уровень…</option>
            {EDUCATION_LEVELS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          <input placeholder="Учебное заведение, специальность" value={a.eduPlace} onChange={(e) => set({ eduPlace: e.target.value })} aria-label="Учебное заведение" />
        </>
      ),
    },
    {
      key: "exp",
      title: "Опыт работы",
      hint: "Общий стаж по профессии и последнее место работы с должностью.",
      body: (
        <>
          <select value={a.expYears} onChange={(e) => set({ expYears: e.target.value })} aria-label="Стаж">
            <option value="">Стаж по профессии…</option>
            {EXPERIENCE_YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <textarea
            rows={3}
            placeholder="Последнее место работы и должность (например: ООО «Ремсервис», токарь 4 разряда, 2019–2025)"
            value={a.expLast}
            onChange={(e) => set({ expLast: e.target.value })}
            aria-label="Последнее место работы"
          />
        </>
      ),
    },
    {
      key: "skills",
      title: "Навыки, разряды, удостоверения",
      hint: "Разряд, допуски, права, корочки — всё, что подтверждает квалификацию.",
      body: (
        <textarea
          rows={3}
          placeholder="Например: токарь 5 разряда, удостоверение стропальщика, права категории C…"
          value={a.skills}
          onChange={(e) => set({ skills: e.target.value })}
          aria-label="Навыки"
        />
      ),
    },
    {
      key: "salary",
      title: "Зарплатные ожидания",
      hint: "Если не готовы называть цифру — оставьте «По договорённости».",
      body: (
        <select value={a.salary} onChange={(e) => set({ salary: e.target.value })} aria-label="Зарплата">
          <option value="">Выберите вариант…</option>
          {SALARY_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      ),
    },
    {
      key: "start",
      title: "Когда готовы приступить?",
      body: (
        <select value={a.start} onChange={(e) => set({ start: e.target.value })} aria-label="Когда готовы приступить">
          <option value="">Выберите вариант…</option>
          {START_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      ),
    },
    {
      key: "free",
      title: "Расскажите о себе своими словами",
      hint: "Чистый лист: всё, чего не хватило в вопросах — почему хотите к нам, чем гордитесь, семейное положение, хобби. Можно пропустить.",
      body: (
        <textarea
          rows={7}
          placeholder="Напишите здесь всё, что хотите добавить от себя…"
          value={a.freeText}
          onChange={(e) => set({ freeText: e.target.value })}
          aria-label="О себе"
        />
      ),
    },
  ];

  const isLast = step === steps.length; // экран отправки после всех вопросов
  const cur = steps[step];

  // Контейнер капчи живёт ВНУТРИ ветки isLast, поэтому «← Назад» его
  // размонтирует вместе с виджетом. Раньше эффект в этом случае не возвращал
  // ничего (ранний `return` внутри `if (window.smartCaptcha)`), widgetId
  // оставался ненулевым — и guard навсегда запрещал повторный рендер: соискатель
  // возвращался на экран отправки без капчи, сервер отвечал 403, и анкета из
  // одиннадцати шагов пропадала под сообщением «Не получилось отправить».
  useEffect(() => {
    if (!isLast || !CAPTCHA_KEY) return;

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
    } else {
      const s = document.createElement("script");
      s.src = "https://smartcaptcha.yandexcloud.net/captcha.js?render=onload";
      s.async = true;
      s.onload = render;
      document.head.appendChild(s);
    }

    return () => {
      if (widgetId.current !== null) {
        // Контейнер к этому моменту уже мог быть удалён из DOM — reset по нему
        // вправе бросить; нам важно лишь снять guard.
        try {
          window.smartCaptcha?.reset(widgetId.current);
        } catch {
          /* виджет уничтожен вместе с контейнером — это и есть штатный путь */
        }
        widgetId.current = null;
      }
      // Токен привязан к уничтоженному виджету: оставить его — значит отправить
      // на сервер заведомо невалидный и получить 403 уже на новом виджете.
      setSmartToken("");
    };
  }, [isLast]);

  const go = (n: number) => {
    setStep(n);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const submit = async () => {
    setStatus("sending");
    const answers: [string, string][] = [
      ["Город проживания:", or(a.city)],
      ["Дата рождения:", a.birth ? new Date(a.birth).toLocaleDateString("ru-RU") : SKIPPED],
      ["Образование:", [a.eduLevel, a.eduPlace].filter(Boolean).join("; ") || SKIPPED],
      ["Стаж по профессии:", or(a.expYears)],
      ["Последнее место работы:", or(a.expLast)],
      ["Навыки, разряды, удостоверения:", or(a.skills)],
      ["Зарплатные ожидания:", or(a.salary)],
      ["Готовность приступить:", or(a.start)],
      ["О себе (свободный рассказ):", or(a.freeText)],
    ];
    try {
      const res = await fetch("/api/rezyume/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vacancy: vacancyFinal,
          name: a.name.trim(),
          phone: a.phone.trim(),
          email: a.email.trim(),
          answers,
          website,
          smartToken,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setStatus("ok");
    } catch {
      setStatus("error");
    }
  };

  if (status === "ok") {
    return (
      <div className="v2-card text-center">
        <p className="text-2xl font-extrabold">Анкета отправлена! 👍</p>
        <p className="mx-auto mt-3 max-w-md text-[var(--v2-muted)]">
          Отдел кадров изучит её и перезвонит по номеру {a.phone}.
          {a.email.trim() && <> Копия анкеты ушла на <span className="font-semibold text-white">{a.email.trim()}</span> — если захотите что-то поправить, заполните анкету заново или ответьте на письмо.</>}
        </p>
        <button className="v2-btn-ghost mt-6" onClick={() => { setA(EMPTY); setStep(0); setStatus("idle"); }}>
          Заполнить ещё одну анкету
        </button>
      </div>
    );
  }

  return (
    <div ref={topRef} className="v2-card scroll-mt-24 !p-6 md:!p-10">
      {/* Прогресс */}
      <div className="mb-6 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-[var(--v2-accent)] transition-all"
            style={{ width: `${Math.round(((step + 1) / (steps.length + 1)) * 100)}%` }}
          />
        </div>
        <span className="text-sm text-[var(--v2-muted)]">
          {Math.min(step + 1, steps.length + 1)} / {steps.length + 1}
        </span>
      </div>

      {!isLast ? (
        <div className="v2-form">
          <h3 className="text-2xl font-extrabold">{cur.title}</h3>
          {cur.hint && <p className="mt-2 mb-5 text-sm text-[var(--v2-muted)]">{cur.hint}</p>}
          {!cur.hint && <div className="mb-5" />}
          {cur.body}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {step > 0 && (
              <button type="button" className="v2-btn-ghost" onClick={() => go(step - 1)}>← Назад</button>
            )}
            <button
              type="button"
              className="v2-btn disabled:cursor-not-allowed disabled:opacity-40"
              disabled={cur.required && cur.valid ? !cur.valid() : false}
              onClick={() => go(step + 1)}
            >
              Далее →
            </button>
            {!cur.required && (
              <button type="button" className="text-sm text-[var(--v2-muted)] underline hover:text-white" onClick={() => go(step + 1)}>
                Пропустить вопрос
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="v2-form">
          <h3 className="text-2xl font-extrabold">Проверьте и отправьте анкету</h3>
          <div className="mt-5 space-y-1 rounded-lg border border-white/10 bg-[var(--v2-steel-2)] p-5 text-sm">
            <p><span className="text-[var(--v2-muted)]">Вакансия:</span> <b>{vacancyFinal}</b></p>
            <p><span className="text-[var(--v2-muted)]">ФИО:</span> {a.name}</p>
            <p><span className="text-[var(--v2-muted)]">Телефон:</span> {a.phone}</p>
            <p><span className="text-[var(--v2-muted)]">E-mail:</span> {a.email.trim() || "не указан — копия анкеты не придёт"}</p>
            <p className="pt-2 text-[var(--v2-muted)]">
              Остальные ответы приложатся к анкете автоматически; пропущенные вопросы будут помечены «{SKIPPED}».
            </p>
          </div>
          {/* honeypot */}
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
          {CAPTCHA_KEY && <div ref={captchaRef} className="my-4" />}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button type="button" className="v2-btn-ghost" onClick={() => go(steps.length - 1)}>← Назад</button>
            <button type="button" className="v2-btn" disabled={status === "sending"} onClick={submit}>
              {status === "sending" ? "Отправка…" : "Отправить анкету на завод"}
            </button>
          </div>
          {status === "error" && (
            <p className="mt-3 text-sm text-red-400">
              Не получилось отправить. Попробуйте ещё раз или позвоните в отдел кадров — телефоны выше. Почта приёмной:{" "}
              <a className="underline" href={`mailto:${SITE.emails.office}`}>{SITE.emails.office}</a>.
            </p>
          )}
          <p className="mt-4 text-xs text-[var(--v2-muted)]">
            Нажимая «Отправить анкету», вы соглашаетесь на обработку персональных данных.
          </p>
        </div>
      )}
    </div>
  );
}
