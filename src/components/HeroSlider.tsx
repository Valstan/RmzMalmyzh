"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

/** Лёгкая замена RevSlider: 6 слайдов с rmz43.ru, автопрокрутка, точки. */
const SLIDES = [1, 2, 3, 4, 5, 6].map((i) => `/images/slides/slide-${i}.webp`);

export default function HeroSlider() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % SLIDES.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="relative overflow-hidden bg-neutral-200" aria-label="Слайды о заводе">
      <div
        className="flex transition-transform duration-700 ease-in-out"
        style={{ transform: `translateX(-${idx * 100}%)` }}
      >
        {SLIDES.map((src, i) => (
          <div key={src} className="w-full shrink-0">
            <Image
              src={src}
              alt={`Малмыжский завод по ремонту дизельных двигателей — слайд ${i + 1}`}
              width={1400}
              height={420}
              priority={i === 0}
              className="w-full h-auto"
            />
          </div>
        ))}
      </div>
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            aria-label={`Слайд ${i + 1}`}
            onClick={() => setIdx(i)}
            className={`w-3 h-3 rounded-full border border-white ${i === idx ? "bg-[var(--accent)]" : "bg-white/60"}`}
          />
        ))}
      </div>
    </section>
  );
}
