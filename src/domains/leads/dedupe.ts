import { normalizeDomain, normalizeInstagram, normalizePhone } from "./normalize";

export type LeadKey = { instagram?: string | null; phone?: string | null; site?: string | null };

export function leadKey(l: LeadKey): {
  instagram: string | null;
  phone: string | null;
  site: string | null;
} {
  return {
    instagram: normalizeInstagram(l.instagram),
    phone: normalizePhone(l.phone),
    site: normalizeDomain(l.site),
  };
}

/**
 * Dois leads são o mesmo negócio quando compartilham @ do Instagram,
 * telefone (só dígitos) ou domínio do site. Nenhum campo sozinho decide,
 * porque o mesmo negócio pode vir por fontes diferentes.
 */
export function isDuplicate(a: LeadKey, b: LeadKey): boolean {
  const ka = leadKey(a);
  const kb = leadKey(b);
  if (ka.instagram && kb.instagram && ka.instagram === kb.instagram) return true;
  if (ka.phone && kb.phone && ka.phone === kb.phone) return true;
  if (ka.site && kb.site && ka.site === kb.site) return true;
  return false;
}

export function dedupe<T extends LeadKey>(items: T[]): { unique: T[]; duplicates: T[] } {
  const unique: T[] = [];
  const duplicates: T[] = [];
  for (const item of items) {
    if (unique.some((u) => isDuplicate(u, item))) duplicates.push(item);
    else unique.push(item);
  }
  return { unique, duplicates };
}
