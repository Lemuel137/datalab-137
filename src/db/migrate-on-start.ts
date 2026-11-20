import "server-only";
import { getPool } from "./client";
import { runMigrations } from "./migrations";

/**
 * Chamado só no runtime Node (ver src/instrumentation.ts). Se a migração falhar,
 * o processo sai: a publicação nova não entra no ar e a anterior continua servindo.
 */
export async function migrateOnStart() {
  try {
    const plan = await runMigrations(getPool());
    const base = plan.baseline.length
      ? `, ${plan.baseline.length} marcada(s) como linha de base`
      : "";
    console.log(`[migrações] ok: ${plan.run.length} aplicada(s)${base}`);
  } catch (e) {
    console.error(
      "[migrações] FALHA ao subir; encerrando para a versão anterior continuar no ar.",
      e,
    );
    process.exit(1);
  }
}
