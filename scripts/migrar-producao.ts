// Aplica as migrações pendentes de drizzle/ no banco de produção.
// Uso: DATABASE_URL=... node scripts/migrar-producao.ts <primeira> [--gravar]
//   <primeira> é o número da primeira migração ainda não aplicada (ex.: 4 para 0004_*).
// Sem --gravar é ensaio: roda tudo numa transação e desfaz.
// Existe porque o usuário do banco de desenvolvimento do DigitalOcean não pode criar o
// schema de controle do drizzle; `pnpm db:migrate` falha lá. Sem controle, quem sabe o
// que já foi aplicado é o deploy/README.md: atualize a linha "Última aplicada" ao gravar.
import { readFileSync } from "node:fs";
import { Pool } from "pg";

const first = Number(process.argv[2]);
const gravar = process.argv[3] === "--gravar";
if (!Number.isInteger(first) || !process.env.DATABASE_URL) {
  console.error("Uso: DATABASE_URL=... node scripts/migrar-producao.ts <primeira> [--gravar]");
  process.exit(1);
}

const url = new URL(process.env.DATABASE_URL);
url.searchParams.delete("sslmode");
const pool = new Pool({ connectionString: url.toString(), ssl: { rejectUnauthorized: false } });

type Entry = { idx: number; tag: string };
const journal: Entry[] = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8")).entries;
const pending = journal.filter((e) => e.idx >= first);

const db = await pool.connect();
try {
  await db.query("BEGIN");
  for (const e of pending) {
    const sql = readFileSync(`drizzle/${e.tag}.sql`, "utf8");
    for (const st of sql.split("--> statement-breakpoint")) {
      if (!st.trim()) continue;
      const r = await db.query(st);
      console.log(e.tag.slice(0, 4), st.trim().split("\n").pop()?.slice(0, 80), r.rowCount ?? "");
    }
  }
  await db.query(gravar ? "COMMIT" : "ROLLBACK");
  console.log(
    gravar ? "GRAVADO" : "ENSAIO (desfeito; use --gravar)",
    pending.map((e) => e.tag),
  );
} catch (e) {
  await db.query("ROLLBACK");
  console.error("ERRO, nada gravado:", e instanceof Error ? e.message : e);
  process.exitCode = 1;
} finally {
  db.release();
  await pool.end();
}
