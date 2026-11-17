import "server-only";
import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";

const COOKIE = "dl137_sessao";
const DURACAO_MS = 1000 * 60 * 60 * 24 * 7;

function chave() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET ausente ou curta demais (mínimo 32 caracteres).");
  }
  return new TextEncoder().encode(secret);
}

export type Sessao = { sub: string };

export async function assinar(sub: string): Promise<string> {
  return new SignJWT({ sub })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(chave());
}

export async function verificar(token: string | undefined): Promise<Sessao | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, chave(), { algorithms: ["HS256"] });
    return typeof payload.sub === "string" ? { sub: payload.sub } : null;
  } catch {
    return null;
  }
}

export async function criarSessao(sub: string) {
  const jar = await cookies();
  jar.set(COOKIE, await assinar(sub), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DURACAO_MS / 1000,
  });
}

export async function encerrarSessao() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function sessaoAtual(): Promise<Sessao | null> {
  const jar = await cookies();
  return verificar(jar.get(COOKIE)?.value);
}

export async function exigirSessao(): Promise<Sessao> {
  const s = await sessaoAtual();
  if (!s) throw new Error("NAO_AUTENTICADO");
  return s;
}

export const COOKIE_NAME = COOKIE;
