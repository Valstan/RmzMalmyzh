import Script from "next/script";
import { ANALYTICS } from "@/lib/site";

/**
 * Счётчик Яндекс.Метрики (D-017). Код инициализации взят из кабинета
 * счётчика 111854549 без правок, кроме подстановки номера из ANALYTICS;
 * `ssr: true` там стоит потому, что страницы у нас рендерит сервер.
 *
 * `afterInteractive` — счётчик не должен тормозить первую отрисовку;
 * визиты Метрика засчитывает и при отложенной загрузке тега.
 */
export default function Metrika() {
  const id = ANALYTICS.metrikaId;

  return (
    <>
      <Script
        id="yandex-metrika"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
   (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
   m[i].l=1*new Date();
   for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
   k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
   (window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=${id}', 'ym');

   ym(${id}, 'init', {ssr:true, clickmap:true, ecommerce:"dataLayer", referrer: document.referrer, url: location.href, accurateTrackBounce:true, trackLinks:true});
          `,
        }}
      />
      <noscript>
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://mc.yandex.ru/watch/${id}`}
            style={{ position: "absolute", left: "-9999px" }}
            alt=""
          />
        </div>
      </noscript>
    </>
  );
}
