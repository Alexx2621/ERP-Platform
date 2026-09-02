import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-[var(--line)] bg-[var(--paper)]">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="text-[15px] font-extrabold tracking-tight text-[var(--ink)] hover:text-[var(--accent)]"
        >
          Tienda
        </Link>
        <nav aria-label="Principal" className="flex items-center gap-5 text-[13px] font-bold">
          <Link href="/" className="text-[var(--muted-strong)] hover:text-[var(--ink)]">
            Catálogo
          </Link>
          <Link href="/cart" className="text-[var(--muted-strong)] hover:text-[var(--ink)]">
            Carrito
          </Link>
        </nav>
      </div>
    </header>
  );
}
