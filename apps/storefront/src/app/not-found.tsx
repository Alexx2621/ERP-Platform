import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-start gap-4">
      <h1 className="text-[22px] font-extrabold text-[var(--ink)]">Página no encontrada</h1>
      <p className="text-[14px] font-medium text-[var(--muted-strong)]">
        No encontramos lo que buscabas.
      </p>
      <Link href="/" className="text-[13px] font-bold text-[var(--accent)] hover:underline">
        Volver a la tienda
      </Link>
    </div>
  );
}
