import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { pool?: Pool };

/**
 * A conexão é criada na primeira consulta, não no import.
 * Sem isso o build quebra: o Next carrega o módulo para montar as rotas,
 * e o build não tem (nem deve ter) acesso ao banco.
 */
/**
 * O banco gerenciado do DigitalOcean usa certificado próprio.
 *
 * Detalhe que custou um deploy: o `pg-connection-string` reconstrói o objeto
 * `ssl` inteiro quando acha `sslmode` na URL, descartando o que passamos no
 * `Pool`. Por isso tiramos o `sslmode` da string e mandamos o SSL pelo objeto.
 */
function separarSsl(connectionString: string) {
  const url = new URL(connectionString);
  const sslmode = url.searchParams.get("sslmode");
  url.searchParams.delete("sslmode");
  return { url: url.toString(), sslmode };
}

function criarPool(): Pool {
  const original = process.env.DATABASE_URL;
  if (!original) {
    throw new Error("DATABASE_URL não definida. Copie .env.example para .env.local.");
  }

  const { url, sslmode } = separarSsl(original);
  const local = /localhost|127\.0\.0\.1/.test(url);

  return new Pool({
    connectionString: url,
    ssl: local || sslmode === "disable" ? undefined : { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 30_000,
  });
}

export function getPool(): Pool {
  if (!globalForDb.pool) globalForDb.pool = criarPool();
  return globalForDb.pool;
}

function criarDb() {
  return drizzle(getPool(), { schema });
}

type Db = ReturnType<typeof criarDb>;

const globalDb = globalThis as unknown as { db?: Db };

/** Objeto preguiçoso: só toca o banco quando alguém consulta. */
export const db: Db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    if (!globalDb.db) globalDb.db = criarDb();
    return Reflect.get(globalDb.db, prop, receiver);
  },
});
