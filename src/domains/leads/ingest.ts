import "server-only";
import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { contacts, findings, fronts, leads } from "@/db/schema";
import { isBlockedCity, mergeFinding, type IngestPayload } from "@/contracts/ingest";
import { normalizeInstagram, normalizePhone } from "./normalize";

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
  if (!front) throw new Error(`Frente "${payload.front}" não existe.`);

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
      const whatsapp = normalizePhone(l.whatsapp);
      const phone = normalizePhone(l.phone);
      const instagram = normalizeInstagram(l.instagram);
      const site = l.sourceUrl ?? null;

      const same = [
        whatsapp ? eq(leads.whatsapp, whatsapp) : undefined,
        instagram ? eq(leads.instagram, instagram) : undefined,
        site ? eq(leads.site, site) : undefined,
      ].filter((c) => c !== undefined);
      const [found] =
        same.length === 0
          ? []
          : await tx
              .select({ id: leads.id })
              .from(leads)
              .where(and(eq(leads.frontId, front.id), or(...same)))
              .limit(1);

      let leadId: string;
      if (found) {
        leadId = found.id;
        out.atualizados++;
        await tx
          .update(leads)
          .set({
            city: l.city ?? sql`${leads.city}`,
            site: site ?? sql`${leads.site}`,
            whatsapp: whatsapp ?? sql`${leads.whatsapp}`,
            phone: phone ?? sql`${leads.phone}`,
            instagram: instagram ?? sql`${leads.instagram}`,
            signals: sql`${leads.signals} || ${JSON.stringify({ ...l.signals, uf: l.uf, cidade: l.city })}::jsonb`,
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
            site,
            whatsapp,
            phone,
            instagram,
            source: "ingest",
            signals: { ...l.signals, uf: l.uf, cidade: l.city },
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
        or(isNull(findings.hook), isNull(findings.customerSide)),
        inArray(leads.stage, ["importado", "qualificado", "aprovado"]),
        sql`not exists (select 1 from ${contacts} where ${contacts.leadId} = ${leads.id})`,
      ),
    );
}
