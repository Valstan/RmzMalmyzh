import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 text-center">
      <h1 className="text-5xl font-bold text-[var(--accent)] mb-4">404</h1>
      <p className="mb-6">Такой страницы нет. Возможно, она переехала.</p>
      <Link href="/" className="btn">На главную</Link>
    </div>
  );
}
