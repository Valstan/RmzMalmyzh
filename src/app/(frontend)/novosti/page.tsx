import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { posts } from "@/lib/content";

export const metadata: Metadata = {
  title: "Новости",
  description:
    "Новости АО «Малмыжский завод по ремонту дизельных двигателей»: производство, модернизация, сотрудничество, технические публикации о дизелях Д6/Д12.",
  alternates: { canonical: "/novosti/" },
};

function excerpt(html: string, n = 220) {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > n ? text.slice(0, n).replace(/\S+$/, "") + "…" : text;
}

export default function NewsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-4xl font-bold text-[var(--accent)] mb-8">Новости</h1>
      <div className="space-y-8">
        {posts.map((p) => (
          <article key={p.slug} className="bg-white rounded shadow-sm p-6 flex gap-5">
            {p.ogImage && (
              <Link href={p.slug} className="hidden sm:block shrink-0">
                <Image src={p.ogImage} alt="" width={160} height={120} className="rounded object-cover w-40 h-28" />
              </Link>
            )}
            <div>
              <p className="text-sm text-neutral-500">
                {new Date(p.published!).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
              </p>
              <h2 className="text-xl font-bold my-1">
                <Link href={p.slug} className="hover:text-[var(--accent)]">{p.h1}</Link>
              </h2>
              <p className="text-sm text-neutral-700">{excerpt(p.html)}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
