import HeroSlider from "@/components/HeroSlider";
import ContentHtml from "@/components/ContentHtml";
import { getPage } from "@/lib/cms";

// Только рантайм: CI собирает с пустой БД, поэтому статический пререндер запёк бы
// пустую страницу и отдавал её до первой ревалидации — час после каждого деплоя.
// Вторая причина — ссылки /media/<id>/… привязаны к конкретной базе, так что
// пререндер на сборочной БД был бы не устаревшим, а прямо неверным.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const page = await getPage("/");
  return (
    <>
      <HeroSlider />
      <div className="mx-auto max-w-6xl px-4 py-8">
        {page && <ContentHtml html={page.html ?? ""} formSubject="Заявка с главной страницы" />}
      </div>
    </>
  );
}
