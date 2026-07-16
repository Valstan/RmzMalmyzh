import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: SITE.name,
    template: `%s — ${SITE.shortName}`,
  },
  description:
    "Капитальный ремонт дизельных двигателей Д6, Д12, ЯМЗ, КамАЗ, судовых и тепловозных дизелей. Реверс-редукторы, гидропередачи, мехобработка, литьё. Завод работает с 1931 года, вся Россия.",
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: SITE.shortName,
    images: ["/images/slides/slide-1.webp"],
  },
};

const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE.name,
  url: SITE.url,
  logo: `${SITE.url}/images/logo.png`,
  foundingDate: String(SITE.foundingYear),
  address: {
    "@type": "PostalAddress",
    postalCode: "612920",
    addressRegion: "Кировская область",
    addressLocality: "Малмыж",
    streetAddress: "ул. Дружбы, 2",
    addressCountry: "RU",
  },
  contactPoint: [
    { "@type": "ContactPoint", telephone: "+7-952-783-07-82", contactType: "sales", email: SITE.emails.sales },
    { "@type": "ContactPoint", telephone: "+7-831-291-00-39", contactType: "customer service", email: SITE.emails.office },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <Header />
        <main className="min-h-[60vh]">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
