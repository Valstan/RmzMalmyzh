import HeroSlider from "@/components/HeroSlider";
import ContentHtml from "@/components/ContentHtml";
import { getPage } from "@/lib/content";

export default function HomePage() {
  const page = getPage("/");
  return (
    <>
      <HeroSlider />
      <div className="mx-auto max-w-6xl px-4 py-8">
        {page && <ContentHtml html={page.html} formSubject="Заявка с главной страницы" />}
      </div>
    </>
  );
}
