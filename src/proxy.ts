import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE = "dl137_sessao";

function chave() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

const INGEST_PATHS = ["/api/ingest/leads", "/api/ingest/pendentes"];

/**
 * A porta de entrada de leads não usa a sessão de login: cada rota confere a
 * própria chave (INGEST_TOKEN). O desvio vale só para os caminhos exatos, e
 * nunca para pedido de server action, que depende deste proxy para exigir login.
 */
export function isIngestRequest(pathname: string, headers: Headers): boolean {
  return INGEST_PATHS.includes(pathname) && !headers.has("next-action");
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isIngestRequest(pathname, request.headers)) return NextResponse.next();

  const token = request.cookies.get(COOKIE)?.value;

  let autenticado = false;
  const k = chave();
  if (token && k) {
    try {
      await jwtVerify(token, k, { algorithms: ["HS256"] });
      autenticado = true;
    } catch {
      autenticado = false;
    }
  }

  if (pathname === "/login") {
    return autenticado ? NextResponse.redirect(new URL("/", request.url)) : NextResponse.next();
  }

  if (!autenticado) {
    const url = new URL("/login", request.url);
    url.searchParams.set("de", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|ico|webp)$).*)"],
};
