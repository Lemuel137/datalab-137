import { checkIngestToken } from "@/domains/auth/ingest-token";

/** Resposta de recusa, ou null quando a chave confere. */
export function refuse(request: Request): Response | null {
  const r = checkIngestToken(request.headers.get("authorization"), process.env.INGEST_TOKEN);
  if (r === "desligada") {
    return Response.json(
      { erro: "Porta de entrada desligada: INGEST_TOKEN não configurado." },
      { status: 503 },
    );
  }
  if (r === "negado") return Response.json({ erro: "Chave inválida." }, { status: 401 });
  return null;
}
