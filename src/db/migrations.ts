import { readFileSync } from "node:fs";
import path from "node:path";
import type { Pool } from "pg";

/**
 * Migração automática: o app aplica as migrações pendentes de drizzle/ quando sobe.
 *
 * Por quê: o banco de produção só aceita conexão do próprio app, então migrar de
 * fora exigia abrir o banco à mão a cada mudança (decisão do Lemuel, 20/11/2026).
 * O controle fica em public.app_migrations, porque o usuário do banco não pode
 * criar o schema "drizzle" que o drizzle-kit usa.
 *
 * REGRA: como não há mais cópia de segurança antes de migrar, migração nova só
 * ACRESCENTA (coluna, tabela, índice) e precisa poder rodar duas vezes sem erro
 * (IF NOT EXISTS, ON CONFLICT). Nada de DROP nem de UPDATE que reescreve dado.
 */

/** Última migração aplicada à mão em produção, antes deste controle existir. */
export const BASELINE = "0004_wakeful_komodo";

export function planMigrations(i: {
  tags: string[];
  applied: string[];
  /** As tabelas do app já existem (banco criado antes do controle). */
  hasSchema: boolean;
  baseline: string;
}): { baseline: string[]; run: string[] } {
  if (i.applied.length === 0 && i.hasSchema) {
    const at = i.tags.indexOf(i.baseline);
    if (at === -1) throw new Error(`A linha de base "${i.baseline}" não está em drizzle/.`);
    return { baseline: i.tags.slice(0, at + 1), run: i.tags.slice(at + 1) };
  }
  return { baseline: [], run: i.tags.filter((t) => !i.applied.includes(t)) };
}

export function splitStatements(sql: string): string[] {
  return sql
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function runMigrations(pool: Pool, dir = path.join(process.cwd(), "drizzle")) {
  const journal = JSON.parse(readFileSync(path.join(dir, "meta/_journal.json"), "utf8")) as {
    entries: { idx: number; tag: string }[];
  };
  const tags = [...journal.entries].sort((a, b) => a.idx - b.idx).map((e) => e.tag);

  const db = await pool.connect();
  try {
    // Uma instância de cada vez: a trava some sozinha se a conexão cair.
    await db.query("SELECT pg_advisory_lock(hashtext('dl137-migrations'))");
    await db.query(
      "CREATE TABLE IF NOT EXISTS app_migrations (tag text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
    );
    const applied = (await db.query("SELECT tag FROM app_migrations")).rows.map(
      (r) => r.tag as string,
    );
    const hasSchema = Boolean(
      (await db.query("SELECT to_regclass('public.fronts') AS t")).rows[0].t,
    );
    const plan = planMigrations({ tags, applied, hasSchema, baseline: BASELINE });

    for (const tag of plan.baseline) {
      await db.query("INSERT INTO app_migrations (tag) VALUES ($1) ON CONFLICT DO NOTHING", [tag]);
    }
    for (const tag of plan.run) {
      const sql = readFileSync(path.join(dir, `${tag}.sql`), "utf8");
      await db.query("BEGIN");
      try {
        for (const st of splitStatements(sql)) await db.query(st);
        await db.query("INSERT INTO app_migrations (tag) VALUES ($1)", [tag]);
        await db.query("COMMIT");
      } catch (e) {
        await db.query("ROLLBACK");
        throw new Error(
          `Migração ${tag} falhou e foi desfeita: ${e instanceof Error ? e.message : e}`,
        );
      }
      console.log(`[migrações] aplicada ${tag}`);
    }
    return plan;
  } finally {
    await db.query("SELECT pg_advisory_unlock(hashtext('dl137-migrations'))").catch(() => {});
    db.release();
  }
}
