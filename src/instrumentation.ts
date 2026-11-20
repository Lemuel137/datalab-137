/**
 * Roda uma vez quando o servidor sobe, antes de atender pedidos: aplica as
 * migrações pendentes (src/db/migrations.ts). O código que usa APIs do Node fica
 * em outro arquivo, importado só no runtime Node, porque este também é compilado
 * para o runtime Edge.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // Na compilação não há banco (e não deve haver).
  if (!process.env.DATABASE_URL || process.env.NEXT_PHASE === "phase-production-build") return;
  const { migrateOnStart } = await import("./db/migrate-on-start");
  await migrateOnStart();
}
