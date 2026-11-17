import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/db/client";
import { fronts, leads } from "@/db/schema";
import { STAGE_LABEL, type Stage } from "@/contracts/funnel";
import { ImportForm } from "./import-form";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const frontList = await db.select().from(fronts).orderBy(fronts.name);
  const rows = await db.select().from(leads).orderBy(desc(leads.createdAt)).limit(50);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10">
      <header className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold">Leads</h1>
        <Link href="/" className="text-sm underline">
          voltar
        </Link>
      </header>

      <section className="border border-zinc-300 p-4">
        <h2 className="mb-3 text-lg font-medium">Importar</h2>
        <ImportForm fronts={frontList.map((f) => ({ slug: f.slug, name: f.name }))} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium">Últimos {rows.length}</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-zinc-500">Nenhum lead importado.</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-300 text-left">
                <th className="py-2">nome</th>
                <th className="py-2">instagram</th>
                <th className="py-2">site</th>
                <th className="py-2">etapa</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.id} className="border-b border-zinc-200">
                  <td className="py-2">{l.name}</td>
                  <td className="py-2 text-zinc-600">{l.instagram ?? "—"}</td>
                  <td className="py-2 text-zinc-600">{l.site ?? "—"}</td>
                  <td className="py-2">{STAGE_LABEL[l.stage as Stage] ?? l.stage}</td>
                  <td className="py-2 text-right">
                    <Link href={`/leads/${l.id}`} className="underline">
                      abrir
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
