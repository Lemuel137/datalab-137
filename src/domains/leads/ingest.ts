import "server-only";
import { and, eq, inArray, isNull, sql, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import { contacts, findings, fronts, leads } from "@/db/schema";
import { isBlockedCity, mergeFinding, sourceKey, type IngestPayload } from "@/contracts/ingest";
import { whatsappNumber } from "@/contracts/queue";
import { normalizeInstagram, normalizePhone } from "./normalize";

export class FrontNotFound extends Error {
  constructor(slug: string) {
    super(`Frente "${slug}" não existe.`);
  }
}

export type IngestResult = {
  criados: number;
  atualizados: number;
  foraLimeira: number;
  achadosNovos: number;
  achadosRemedidos: number;
};

/**
 * Entrada de leads de uma fonte automática (Captor e outras).
 * Nunca mexe em etapa nem em contato: quem já foi abordado só recebe dado novo.
 */
export async function ingestLeads(payload: IngestPayload): Promise<IngestResult> {
  const [front] = await db.select().from(fronts).where(eq(fronts.slug, payload.front)).limit(1);
  if (!front) throw new FrontNotFound(payload.front);

  const out: IngestResult = {
    criados: 0,
    atualizados: 0,
    foraLimeira: 0,
    achadosNovos: 0,
    achadosRemedidos: 0,
  };

  await db.transaction(async (tx) => {
    for (const l of payload.leads) {
      if (isBlockedCity(l.city)) {
        out.foraLimeira++;
        continue;
      }
      // WhatsApp sempre com DDI; o endereço da fonte, na forma de comparação.
      const whatsapp = whatsappNumber(l.whatsapp);
      const phone = normalizePhone(l.phone);
      const instagram = normalizeInstagram(l.instagram);
      const site = sourceKey(l.sourceUrl);

      // Casa por um critério de cada vez, do mais forte ao mais fraco: com tudo num "ou",
      // um lead que casa com dois registros cairia em um deles ao acaso.
      const inFront = (cond: SQL) =>
        tx
          .select({ id: leads.id })
          .from(leads)
          .where(and(eq(leads.frontId, front.id), cond))
          .orderBy(leads.createdAt)
          .limit(1);
      const criteria: (SQL | null)[] = [
        // Importações antigas guardaram o número sem o 55.
        whatsapp ? inArray(leads.whatsapp, [whatsapp, whatsapp.slice(2)]) : null,
        instagram ? eq(leads.instagram, instagram) : null,
        phone ? eq(leads.phone, phone) : null,
        site ? sql`${leads.signals}->>'fonte' = ${site}` : null,
      ];
      let found: { id: string } | undefined;
      for (const c of criteria) {
        if (c && !found) [found] = await inFront(c);
      }

      // Só o que veio preenchido entra em signals: nulo não pode apagar cidade ou UF já gravadas.
      const extra = Object.fromEntries(
        Object.entries({ uf: l.uf, cidade: l.city, fonte: site }).filter(([, v]) => v != null),
      );
      const signals = { ...l.signals, ...extra };

      let leadId: string;
      if (found) {
        leadId = found.id;
        out.atualizados++;
        // Contato existente nunca é trocado pela entrada: só preenche o que estava vazio.
        // Sem isso, duas lojas com o mesmo endereço de fonte trocariam o WhatsApp uma da outra.
        await tx
          .update(leads)
          .set({
            city: sql`coalesce(${leads.city}, ${l.city})`,
            site: sql`coalesce(${leads.site}, ${l.sourceUrl ?? null})`,
            whatsapp: sql`coalesce(${leads.whatsapp}, ${whatsapp})`,
            phone: sql`coalesce(${leads.phone}, ${phone})`,
            instagram: sql`coalesce(${leads.instagram}, ${instagram})`,
            signals: sql`${leads.signals} || ${JSON.stringify(signals)}::jsonb`,
            // Medição nova substitui a antiga; sem medição no envio, fica a que já havia.
            ...(l.followers != null ? { followers: l.followers } : {}),
            ...(l.engagementPct != null ? { engagementPct: l.engagementPct } : {}),
            updatedAt: new Date(),
          })
          .where(eq(leads.id, leadId));
      } else {
        out.criados++;
        const [created] = await tx
          .insert(leads)
          .values({
            frontId: front.id,
            name: l.name,
            city: l.city,
            site: l.sourceUrl ?? null,
            whatsapp,
            phone,
            instagram,
            source: "ingest",
            followers: l.followers ?? null,
            engagementPct: l.engagementPct ?? null,
            signals,
          })
          .returning({ id: leads.id });
        leadId = created.id;
      }

      const current = await tx
        .select({ id: findings.id, kind: findings.kind, summary: findings.summary })
        .from(findings)
        .where(and(eq(findings.leadId, leadId), eq(findings.origin, "script")));

      for (const f of l.findings) {
        const m = mergeFinding(current, f);
        const hookFields = f.hookBy
          ? { hook: f.hook, customerSide: f.customerSide, hookBy: f.hookBy }
          : {};
        if (m.action === "touch") {
          out.achadosRemedidos++;
          await tx
            .update(findings)
            .set({ verifiedAt: f.verifiedAt, evidenceUrl: f.evidenceUrl, ...hookFields })
            .where(eq(findings.id, m.id));
        } else {
          out.achadosNovos++;
          if (m.removeIds.length) {
            await tx.delete(findings).where(inArray(findings.id, m.removeIds));
          }
          await tx.insert(findings).values({
            leadId,
            summary: f.summary,
            evidenceUrl: f.evidenceUrl,
            verifiedAt: f.verifiedAt,
            // Medição de script nunca entra com confiança alta.
            confidence: "media",
            kind: f.kind,
            origin: "script",
            ...hookFields,
          });
        }
      }
    }
  });

  return out;
}

/**
 * Leads ainda não contatados cujo achado de script está sem gancho ou sem lado
 * do cliente: é a lista que a rotina das 6h usa para escrever.
 */
export async function pendingHooks(frontSlug: string) {
  return db
    .select({
      leadId: leads.id,
      name: leads.name,
      whatsapp: leads.whatsapp,
      instagram: leads.instagram,
      city: leads.city,
      sourceUrl: leads.site,
      signals: leads.signals,
      kind: findings.kind,
      summary: findings.summary,
      evidenceUrl: findings.evidenceUrl,
      verifiedAt: findings.verifiedAt,
    })
    .from(findings)
    .innerJoin(leads, eq(findings.leadId, leads.id))
    .innerJoin(fronts, eq(leads.frontId, fronts.id))
    .where(
      and(
        eq(fronts.slug, frontSlug),
        eq(findings.origin, "script"),
        // Revisado (aprovado ou vetado) só volta se a medição mudar (vira achado novo).
        isNull(findings.hookBy),
        inArray(leads.stage, ["importado", "qualificado", "aprovado"]),
        sql`not exists (select 1 from ${contacts} where ${contacts.leadId} = ${leads.id})`,
      ),
    );
}
