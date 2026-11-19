// Carga do histórico de prospecção com as datas reais do arquivo.
// Uso: DATABASE_URL=... node scripts/carga-historico.ts <arquivo.json> [--gravar]
// Sem --gravar é ensaio: faz tudo dentro de uma transação e desfaz no fim.
// Pode rodar de novo: contato (lead+canal+data) e achado (lead+resumo) repetidos são pulados.
import { readFileSync } from "node:fs";
import { Pool } from "pg";
import { matchKey, replyDate, type HistLead } from "../src/domains/leads/history.ts";

const [file, flag] = process.argv.slice(2);
const gravar = flag === "--gravar";
if (!file || !process.env.DATABASE_URL) {
  console.error("Uso: DATABASE_URL=... node scripts/carga-historico.ts <arquivo.json> [--gravar]");
  process.exit(1);
}

// Mesmo tratamento de SSL de src/db/client.ts (banco gerenciado usa certificado próprio).
const url = new URL(process.env.DATABASE_URL);
const sslmode = url.searchParams.get("sslmode");
url.searchParams.delete("sslmode");
const local = /localhost|127\.0\.0\.1/.test(url.host);
const pool = new Pool({
  connectionString: url.toString(),
  ssl: local || sslmode === "disable" ? undefined : { rejectUnauthorized: false },
});

const { leads } = JSON.parse(readFileSync(file, "utf8")) as { leads: HistLead[] };
const n = { casados: 0, criados: 0, contatos: 0, achados: 0, repetidos: 0 };
const semFrente: string[] = [];

const db = await pool.connect();
try {
  await db.query("BEGIN");
  const fronts = new Map(
    (await db.query("SELECT slug, id FROM fronts")).rows.map((r) => [r.slug, r.id]),
  );

  for (const l of leads) {
    const frontId = fronts.get(l.frente_slug);
    if (!frontId) {
      semFrente.push(`${l.nome} (${l.frente_slug})`);
      continue;
    }

    const key = matchKey(l);
    const found = key.instagram
      ? await db.query("SELECT id FROM leads WHERE lower(ltrim(instagram,'@')) = $1", [
          key.instagram,
        ])
      : await db.query("SELECT id FROM leads WHERE lower(trim(name)) = $1", [key.name]);
    if (found.rows.length > 1) throw new Error(`Mais de um lead casa com "${l.nome}"`);

    const signals: Record<string, unknown> = {
      historico_status: l.status_original ?? null,
      historico_proximo_passo: l.proximo_passo_original ?? null,
      historico_obs_etapa: l.obs_etapa || null,
    };
    const aprox = l.contatos
      .filter((c) => c.resposta_tipo)
      .map((c) => replyDate(c, l.status_original).fonte)
      .find((f) => f !== "arquivo");
    if (aprox) {
      signals.data_resposta_aproximada = true;
      signals.data_resposta_fonte = aprox;
    }

    let leadId: string;
    if (found.rows[0]) {
      leadId = found.rows[0].id;
      n.casados++;
      await db.query(
        "UPDATE leads SET stage = $2, signals = signals || $3::jsonb, updated_at = now() WHERE id = $1",
        [leadId, l.etapa_sugerida, JSON.stringify(signals)],
      );
    } else {
      n.criados++;
      const ins = await db.query(
        `INSERT INTO leads (front_id, name, instagram, stage, source, signals)
         VALUES ($1, $2, $3, $4, 'historico', $5::jsonb) RETURNING id`,
        [frontId, l.nome, key.instagram ?? null, l.etapa_sugerida, JSON.stringify(signals)],
      );
      leadId = ins.rows[0].id;
      console.log(`  criado: ${l.nome}`);
    }

    for (const c of l.contatos) {
      const r = c.resposta_tipo ? replyDate(c, l.status_original) : null;
      const ins = await db.query(
        `INSERT INTO contacts (lead_id, channel, sent_at, message, is_follow_up, replied_at, reply_kind, created_at)
         SELECT $1, $2, $3::timestamptz, $4, $5, $6::timestamptz, $7, $3::timestamptz
         WHERE NOT EXISTS (SELECT 1 FROM contacts WHERE lead_id = $1 AND channel = $2 AND sent_at = $3::timestamptz)`,
        [leadId, c.canal, c.enviado_em, c.mensagem, c.follow_up, r?.at ?? null, c.resposta_tipo],
      );
      if (ins.rowCount) n.contatos++;
      else n.repetidos++;
    }

    for (const a of l.achados ?? []) {
      // Achados do histórico foram conferidos no navegador; o tipo fica "outro".
      const ins = await db.query(
        `INSERT INTO findings (lead_id, summary, evidence_url, verified_at, confidence, created_at)
         SELECT $1, $2, $3, $4::timestamptz, $5, $4::timestamptz
         WHERE NOT EXISTS (SELECT 1 FROM findings WHERE lead_id = $1 AND summary = $2)`,
        [leadId, a.resumo, a.evidencia_url, a.verificado_em, a.confianca],
      );
      if (ins.rowCount) n.achados++;
      else n.repetidos++;
    }
  }

  await db.query(gravar ? "COMMIT" : "ROLLBACK");
} catch (e) {
  await db.query("ROLLBACK");
  throw e;
} finally {
  db.release();
  await pool.end();
}

console.log(gravar ? "GRAVADO" : "ENSAIO (nada gravado; use --gravar)", n);
if (semFrente.length) console.log(`Pulados por falta de frente (${semFrente.length}):`, semFrente);
