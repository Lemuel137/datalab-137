import Link from "next/link";
import { count } from "drizzle-orm";
import { db } from "@/db/client";
import { sair } from "./login/actions";
import { fronts, leads } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [frontsCount] = await db.select({ n: count() }).from(fronts);
  const [leadsCount] = await db.select({ n: count() }).from(leads);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-16">
      <header>
        <p className="text-xs uppercase tracking-widest text-zinc-500">Datalab137</p>
        <h1 className="text-3xl font-semibold">Prospecção</h1>
      </header>

      <dl className="grid grid-cols-2 gap-4">
        <div className="border border-zinc-300 p-4">
          <dt className="text-xs uppercase tracking-wide text-zinc-500">Frentes</dt>
          <dd className="text-2xl font-semibold">{frontsCount?.n ?? 0}</dd>
        </div>
        <div className="border border-zinc-300 p-4">
          <dt className="text-xs uppercase tracking-wide text-zinc-500">Leads</dt>
          <dd className="text-2xl font-semibold">{leadsCount?.n ?? 0}</dd>
        </div>
      </dl>

      <nav className="flex gap-4 text-sm">
        <Link href="/leads" className="underline">
          leads
        </Link>
        <Link href="/aprovacao" className="underline">
          aprovação de lote
        </Link>
        <form action={sair}>
          <button type="submit" className="underline">
            sair
          </button>
        </form>
      </nav>
    </main>
  );
}
