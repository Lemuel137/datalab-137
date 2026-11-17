import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Compara a senha informada com a senha do ambiente em tempo constante.
 * A senha nunca é gravada no banco: o sistema é mono-tenant, de um usuário só.
 */
export function senhaConfere(informada: string, esperada = process.env.APP_PASSWORD): boolean {
  if (!esperada || esperada.length < 8) return false;
  if (!informada) return false;

  const a = createHash("sha256").update(informada).digest();
  const b = createHash("sha256").update(esperada).digest();
  return timingSafeEqual(a, b);
}
