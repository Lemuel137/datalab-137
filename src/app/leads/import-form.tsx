"use client";

import { useActionState } from "react";
import { importLeads, type ImportState } from "@/domains/leads/import";

export function ImportForm({ fronts }: { fronts: { slug: string; name: string }[] }) {
  const [state, action, pending] = useActionState<ImportState | undefined, FormData>(
    importLeads,
    undefined,
  );

  return (
    <form action={action} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        Frente
        <select name="front" className="border border-zinc-300 p-2" defaultValue={fronts[0]?.slug}>
          {fronts.map((f) => (
            <option key={f.slug} value={f.slug}>
              {f.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Formato
        <select name="formato" className="border border-zinc-300 p-2" defaultValue="csv">
          <option value="csv">CSV do qualificador</option>
          <option value="dossie">JSON de dossiê</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Conteúdo do arquivo
        <textarea
          name="conteudo"
          rows={10}
          spellCheck={false}
          className="border border-zinc-300 p-2 font-mono text-xs"
          placeholder="cole aqui o CSV ou o JSON"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {pending ? "importando..." : "importar"}
      </button>

      {state && (
        <p className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-700"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
