import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE = "dl137_sessao";

function chave() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
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
