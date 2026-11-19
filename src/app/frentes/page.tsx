import Link from "next/link";
import { db } from "@/db/client";
import { fronts } from "@/db/schema";
import { FrontForm } from "./front-form";

export const dynamic = "force-dynamic";

export default async function FrentesPage() {
  const list = await db.select().from(fronts).orderBy(fronts.name);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10">
      <header className="flex items-baseline justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-zinc-500">Configuração</p>
          <h1 className="text-2xl font-semibold">Frentes</h1>
        </div>
        <Link href="/" className="text-sm underline">
          voltar
        </Link>
      </header>
      <p className="text-sm text-zinc-500">
        Cada frente é um nicho. A fila do dia divide a meta semanal pelos dias úteis e nunca passa
        do limite diário do canal.
      </p>
      {list.map((f) => (
        <FrontForm key={f.id} front={f} />
      ))}
    </main>
  );
}
