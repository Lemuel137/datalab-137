import Link from "next/link";
import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import { sessaoAtual } from "@/domains/auth/session";
import { db } from "@/db/client";
import { fronts, leads } from "@/db/schema";
import { STAGE_LABEL, type Stage } from "@/contracts/funnel";
import { ImportForm } from "./import-form";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  if (!(await sessaoAtual())) redirect("/login");
  const frontList = await db.select().from(fronts).orderBy(fronts.name);
  const rows = await db.select().from(leads).orderBy(desc(leads.createdAt)).limit(50);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-8">
      <header className="flex items-baseline justify-between gap-4">
        <h1 className="text-[32px] font-semibold leading-9 tracking-tight">Leads</h1>
      </header>

      <section>
        <h2 className="mb-3 text-xl font-semibold tracking-tight">Últimos {rows.length}</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-ink-muted">Nenhum lead importado.</p>
        ) : (
          <div className="card overflow-x-auto px-5 py-2">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="label-caps border-b border-line text-left">
                  <th className="py-2">nome</th>
                  <th className="py-2">instagram</th>
                  <th className="py-2">site</th>
                  <th className="py-2">etapa</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((l) => (
                  <tr key={l.id} className="border-b border-line">
                    <td className="py-2">{l.name}</td>
                    <td className="py-2 text-ink-muted">{l.instagram ?? "—"}</td>
                    <td className="py-2 text-ink-muted">{l.site ?? "—"}</td>
                    <td className="py-2">
                      <span className="chip">{STAGE_LABEL[l.stage as Stage] ?? l.stage}</span>
                    </td>
                    <td className="py-2 text-right">
                      <Link href={`/leads/${l.id}`} className="underline">
                        abrir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <details className="card">
        <summary className="p-5 font-semibold">Importar leads por arquivo</summary>
        <div className="px-5 pb-5">
          <ImportForm fronts={frontList.map((f) => ({ slug: f.slug, name: f.name }))} />
        </div>
      </details>
    </main>
  );
}
