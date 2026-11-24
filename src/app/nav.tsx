"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { sair } from "./login/actions";

const ITEMS = [
  { href: "/fila", label: "Fila" },
  { href: "/enviadas", label: "Enviadas" },
  { href: "/leads", label: "Leads" },
  { href: "/frentes", label: "Frentes" },
  { href: "/briefings", label: "Briefings" },
];

/** Barra fixa do topo. Não aparece no login. */
export function Nav() {
  const pathname = usePathname();
  // Sem barra no login e na página pública do briefing (quem responde não é usuário do CRM).
  if (pathname === "/login" || pathname.startsWith("/b/")) return null;

  return (
    <header className="border-b border-line">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-6 px-4 py-3 sm:px-8">
        <Link href="/fila" className="text-[17px] font-semibold tracking-tight">
          Datalab<span className="text-brand-text">137</span>
        </Link>
        <nav aria-label="Principal" className="flex gap-1">
          {ITEMS.map((i) => {
            const on = pathname === i.href || pathname.startsWith(`${i.href}/`);
            return (
              <Link
                key={i.href}
                href={i.href}
                aria-current={on ? "page" : undefined}
                className={`rounded-md px-3 py-1.5 text-sm ${
                  on ? "bg-surface-raised text-ink" : "text-ink-muted hover:text-ink"
                }`}
              >
                {i.label}
              </Link>
            );
          })}
        </nav>
        <form action={sair} className="ml-auto">
          <button type="submit" className="text-sm font-normal text-ink-muted hover:text-ink">
            sair
          </button>
        </form>
      </div>
    </header>
  );
}
