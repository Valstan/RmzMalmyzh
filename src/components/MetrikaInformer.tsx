import { ANALYTICS } from "@/lib/site";

/**
 * Видимый информер посещаемости в подвале (D-017: владелец хочет видеть цифру
 * на самом сайте, а не только в кабинете Метрики).
 *
 * Разметка — дословно из кабинета (G237). Трогать class и data-* нельзя:
 * по ним тег Метрики находит информер; без них картинка остаётся нулевой,
 * отдавая при этом честные 200 и корректные 88×31 — то есть поломку не видно
 * ни по коду ответа, ни глазами на «картинка есть».
 *
 * next/image здесь неприменим: нужен сырой <img> с class/data-атрибутами.
 */
export default function MetrikaInformer({ className }: { className?: string }) {
  const { informer } = ANALYTICS;

  return (
    <a
      href={informer.href}
      target="_blank"
      rel="nofollow noopener"
      className={className}
      title="Статистика посещаемости сайта"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={informer.src}
        style={{ width: informer.width, height: informer.height, border: 0 }}
        width={informer.width}
        height={informer.height}
        alt="Яндекс.Метрика"
        title={informer.title}
        className="ym-advanced-informer"
        data-cid={String(ANALYTICS.metrikaId)}
        data-lang="ru"
      />
    </a>
  );
}
