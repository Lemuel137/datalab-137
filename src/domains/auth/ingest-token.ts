import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Confere a chave da porta de entrada (Authorization: Bearer <INGEST_TOKEN>).
 * "desligada": o app não tem chave configurada (ou tem uma fraca) e a porta não atende.
 */
export function checkIngestToken(
  header: string | null,
  expected: string | undefined,
): "ok" | "negado" | "desligada" {
  if (!expected || expected.length < 32) return "desligada";
  const given = header?.startsWith("Bearer ") ? header.slice(7) : "";
  // Compara os hashes: mesmo tamanho sempre, sem vazar o comprimento nem o ponto do erro.
  const h = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(h(given), h(expected)) ? "ok" : "negado";
}
