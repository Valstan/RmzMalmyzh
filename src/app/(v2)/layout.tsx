import type { Metadata } from "next";
import "./v2.css";
import HeaderV2 from "@/components/v2/HeaderV2";
import FooterV2 from "@/components/v2/FooterV2";
import Metrika from "@/components/Metrika";
import { SITE } from "@/lib/site";

/**
 * Корневой layout ветки v2 (/new/) — превью нового интерфейса для руководства.
 * Отдельная route-group со своим <html>: у v2 своя тема и свой CSS-бандл.
 * ВАЖНО: noindex — пока v2 не стал основным, дубли контента в поиск не отдаём.
 * Переезд на корень: перенести src/app/(v2)/new/* в корень группы и снять noindex.
 */

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `Ремонт дизельных двигателей — ${SITE.shortName} (новый сайт)`,
    template: `%s — ${SITE.shortName}`,
  },
  description:
    "Капитальный ремонт дизельных двигателей со стендовыми испытаниями: Д6, Д12, ЯМЗ, КамАЗ, судовые и тепловозные дизели. Завод в Малмыже, работаем со всей Россией с 1931 года.",
  robots: { index: false, follow: false },
};

export default function V2Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <HeaderV2 />
        <main>{children}</main>
        <FooterV2 />
        <Metrika />
      </body>
    </html>
  );
}
