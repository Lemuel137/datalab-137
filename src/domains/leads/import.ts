"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { fronts, leads } from "@/db/schema";
import { dossierSchema, leadRowSchema } from "@/contracts/lead";
import { parseCsv } from "@/domains/leads/normalize";
import { dedupe, isDuplicate } from "@/domains/leads/dedupe";

export type ImportState = { ok: boolean; message: string };

export async function importLeads(
  _prev: ImportState | undefined,
  formData: FormData,
): Promise<ImportState> {
  const frontSlug = String(formData.get("front") ?? "");
  const raw = String(formData.get("conteudo") ?? "").trim();
  const format = String(formData.get("formato") ?? "csv");

  if (!frontSlug) return { ok: false, message: "Escolha a frente." };
  if (!raw) return { ok: false, message: "Cole o conteúdo do arquivo." };

  const front = await db.query.fronts.findFirst({ where: eq(fronts.slug, frontSlug) });
  if (!front) return { ok: false, message: "Frente não encontrada." };

  let parsed: ReturnType<typeof mapCsv> | ReturnType<typeof mapDossier>;
  try {
    parsed = format === "dossie" ? mapDossier(raw) : mapCsv(raw);
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Arquivo inválido." };
  }

  const existing = await db
    .select({ instagram: leads.instagram, phone: leads.phone, site: leads.site })
    .from(leads)
    .where(eq(leads.frontId, front.id));

  const { unique, duplicates } = dedupe(parsed);
  const novos = unique.filter((l) => !existing.some((e) => isDuplicate(e, l)));
  const jaNoBanco = parsed.length - novos.length;

  if (novos.length > 0) {
    await db.insert(leads).values(
      novos.map((l) => ({
        frontId: front.id,
        name: l.name,
        category: l.category,
        site: l.site,
        instagram: l.instagram,
        phone: l.phone,
        whatsapp: l.whatsapp,
        rating: l.rating,
        reviewCount: l.reviewCount,
        source: format,
        signals: l.signals,
      })),
    );
  }

  revalidatePath("/leads");
  return {
    ok: true,
    message: `${novos.length} lead(s) importado(s). ${jaNoBanco} duplicata(s) ignorada(s).`,
  };
}

type MappedLead = {
  name: string;
  category?: string;
  site?: string;
  instagram?: string;
  phone?: string;
  whatsapp?: string;
  rating?: string;
  reviewCount?: number;
  signals: Record<string, unknown>;
};

function mapCsv(raw: string): MappedLead[] {
  const rows = parseCsv(raw);
  const out: MappedLead[] = [];
  rows.forEach((row, i) => {
    const r = leadRowSchema.safeParse(row);
    if (!r.success) throw new Error(`Linha ${i + 2} inválida: ${r.error.issues[0].message}`);
    const d = r.data;
    out.push({
      name: d.nome,
      category: d.categoria,
      site: d.site,
      instagram: d.instagram,
      phone: d.telefone,
      whatsapp: d.whatsapp,
      rating: d.nota,
      reviewCount: d.n_avaliacoes,
      signals: {
        google_ads: d.google_ads,
        pixel_meta: d.pixel_meta,
        ga4_gtm: d.ga4_gtm,
        units: d.unidades,
        maps: d.maps,
      },
    });
  });
  return out;
}

function mapDossier(raw: string): MappedLead[] {
  const json: unknown = JSON.parse(raw);
  const list = Array.isArray(json) ? json : [json];
  return list.map((item, i) => {
    const r = dossierSchema.safeParse(item);
    if (!r.success) throw new Error(`Dossiê ${i + 1} inválido: ${r.error.issues[0].message}`);
    const d = r.data;
    return {
      name: d.nome,
      category: d.categoria,
      site: d.site?.url_final,
      instagram: undefined,
      phone: d.telefone,
      whatsapp: undefined,
      rating: d.nota === undefined ? undefined : String(d.nota),
      reviewCount: d.n_avaliacoes,
      signals: {
        tem_site: d.site?.tem_site,
        pixel_meta_id: d.site?.pixel_meta_id,
        google_ads_id: d.site?.google_ads_id,
        ga4_id: d.site?.ga4_id,
        gtm: d.site?.gtm,
        prova_social: d.site?.prova_social,
        nota_media_recentes: d.avaliacoes?.nota_media_recentes,
        respondidas_pelo_dono: d.avaliacoes?.respondidas_pelo_dono,
        reclamacoes: d.avaliacoes?.reclamacoes_atendimento?.length ?? 0,
      },
    };
  });
}
