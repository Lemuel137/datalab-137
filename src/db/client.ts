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
 * O banco do DigitalOcean usa certificado próprio e o `sslmode=require` do
 * Postgres trata a cadeia como não confiável. Localmente isso não aparece
 * (Docker sem SSL); em produção derrubava toda consulta com
 * "self-signed certificate in certificate chain".
 */
function sslPara(connectionString: string) {
  const local = /localhost|127\.0\.0\.1/.test(connectionString);
  return local ? undefined : { rejectUnauthorized: false };
}

function criarPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL não definida. Copie .env.example para .env.local.");
  }
  return new Pool({
    connectionString,
    ssl: sslPara(connectionString),
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
