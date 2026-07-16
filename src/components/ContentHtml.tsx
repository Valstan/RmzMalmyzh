import ContactForm from "./ContactForm";

/**
 * Рендер харвестнутого контента. Маркеры .rmz-form-slot (бывшие CF7-формы
 * оригинала) заменяются живым компонентом формы.
 */
export default function ContentHtml({ html, formSubject }: { html: string; formSubject: string }) {
  const parts = html.split('<div class="rmz-form-slot"></div>');
  return (
    <div className="prose-rmz">
      {parts.map((chunk, i) => (
        <div key={i}>
          <div dangerouslySetInnerHTML={{ __html: chunk }} />
          {i < parts.length - 1 && <ContactForm subject={formSubject} />}
        </div>
      ))}
    </div>
  );
}
