import { db } from "@/db/client";
import { fronts } from "@/db/schema";
import { FrontForm } from "./front-form";

export const dynamic = "force-dynamic";

export default async function FrentesPage() {
  const list = await db.select().from(fronts).orderBy(fronts.name);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-8">
      <header className="flex items-baseline justify-between gap-4">
        <div>
          <p className="label-caps">Configuração</p>
          <h1 className="text-[32px] font-semibold leading-9 tracking-tight">Frentes</h1>
        </div>
      </header>
      <p className="text-sm text-ink-muted">
        Cada frente é um nicho. A fila do dia divide a meta semanal pelos dias úteis e nunca passa
        do limite diário do canal.
      </p>
      {list.map((f) => (
        <FrontForm key={f.id} front={f} />
      ))}
    </main>
  );
}
