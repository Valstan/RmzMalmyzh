import type { Metadata } from "next";
import Link from "next/link";
import { getFaq } from "@/lib/cms";
import { SITE } from "@/lib/site";

/**
 * FAQ с разметкой FAQPage (аудит §3.4) — главный формат, который LLM-поисковики
 * пересказывают дословно. Контент живёт в Payload (коллекция faq, сид из
 * материалов стадии 1); правки — в админке.
 */

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Вопросы и ответы о ремонте дизельных двигателей",
  description:
    "Частые вопросы: какие двигатели ремонтируем (Д6, Д12, ЯМЗ, КамАЗ), как проходит капремонт, стендовые испытания, бесплатная доставка, покупка двигателей после капремонта.",
  alternates: { canonical: "/voprosy-i-otvety/" },
};

export default async function FaqPage() {
  const faq = await getFaq();
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <h1 className="text-3xl font-bold mb-6">Вопросы и ответы</h1>
      <p className="text-neutral-600 mb-8">
        Ответы на частые вопросы о капитальном ремонте дизельных двигателей на {SITE.shortName.toLowerCase()}е.
      </p>
      <div className="space-y-6">
        {faq.map((f) => (
          <section key={f.question} className="border-b border-neutral-200 pb-6">
            <h2 className="text-xl font-semibold mb-2">{f.question}</h2>
            <p className="text-neutral-700">{f.answer}</p>
            {f.links && f.links.length > 0 && (
              <p className="mt-2 text-sm">
                {f.links.map((l) => (
                  <Link key={l.href} href={l.href} className="text-[var(--accent)] hover:underline mr-4">
                    {l.label} →
                  </Link>
                ))}
              </p>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
