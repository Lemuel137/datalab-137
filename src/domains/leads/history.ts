// Regras puras da carga do histórico (scripts/carga-historico.ts).
// Extensão .ts no import: o script roda direto no Node, que não resolve sem ela.
import { normalizeInstagram } from "./normalize.ts";

export type HistContact = {
  canal: string;
  enviado_em: string;
  follow_up: boolean;
  mensagem: string;
  resposta_tipo: string | null;
  respondido_em: string | null;
};

export type HistLead = {
  nome: string;
  instagram?: string | null;
  frente_slug: string;
  etapa_sugerida: string;
  obs_etapa?: string;
  contatos: HistContact[];
  achados?: { resumo: string; evidencia_url: string; verificado_em: string; confianca: string }[];
  status_original?: string | null;
  proximo_passo_original?: string | null;
};

export type ReplyDate = { at: Date; fonte: "arquivo" | "status_original" | "envio" };

/**
 * Data da resposta: a do arquivo; senão a primeira "DD/MM [HH:MM]" do status
 * que não seja anterior ao envio; senão a data do envio. As duas últimas são
 * aproximadas e ficam marcadas em signals.
 */
export function replyDate(c: HistContact, status: string | null | undefined): ReplyDate {
  if (c.respondido_em) return { at: new Date(c.respondido_em), fonte: "arquivo" };
  const sent = new Date(c.enviado_em);
  const ano = c.enviado_em.slice(0, 4);
  for (const m of (status ?? "").matchAll(/\b(\d{2})\/(\d{2})(?:\s+(\d{2}):(\d{2}))?/g)) {
    const at = new Date(`${ano}-${m[2]}-${m[1]}T${m[3] ?? "12"}:${m[4] ?? "00"}:00-03:00`);
    // Só data ("03/11") vale se for de um dia depois do envio; com hora, basta ser depois.
    if (!Number.isNaN(at.getTime()) && at > sent) return { at, fonte: "status_original" };
  }
  return { at: sent, fonte: "envio" };
}

/** Chave para casar com lead existente: Instagram normalizado, senão o nome. */
export function matchKey(l: Pick<HistLead, "nome" | "instagram">) {
  const ig = normalizeInstagram(l.instagram);
  return ig ? { instagram: ig } : { name: l.nome.trim().toLowerCase() };
}
