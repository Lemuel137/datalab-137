import { revalidatePath } from "next/cache";
import { parseIngest } from "@/contracts/ingest";
import { FrontNotFound, ingestLeads } from "@/domains/leads/ingest";
import { refuse } from "../auth";

const MAX_BYTES = 2_000_000;

export async function POST(request: Request) {
  const denied = refuse(request);
  if (denied) return denied;

  // Recusa pelo tamanho declarado antes de ler, e confere de novo em bytes depois.
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BYTES) {
    return Response.json({ erro: "Corpo grande demais (limite de 2 MB)." }, { status: 413 });
  }
  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > MAX_BYTES) {
    return Response.json({ erro: "Corpo grande demais (limite de 2 MB)." }, { status: 413 });
  }
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return Response.json({ erro: "Corpo não é JSON." }, { status: 400 });
  }
  const parsed = parseIngest(json);
  if (!parsed.ok) return Response.json({ erro: parsed.erro }, { status: 400 });
  if (parsed.leads.length === 0) {
    return Response.json(
      { erro: "Nenhum lead válido no lote.", rejeitados: parsed.rejeitados },
      { status: 400 },
    );
  }

  try {
    const result = await ingestLeads({ front: parsed.front, leads: parsed.leads });
    revalidatePath("/fila");
    revalidatePath("/leads");
    return Response.json({ ...result, rejeitados: parsed.rejeitados });
  } catch (e) {
    if (e instanceof FrontNotFound) return Response.json({ erro: e.message }, { status: 404 });
    // O erro do banco traz SQL e valores: fica no log do servidor, não na resposta.
    console.error("[ingest] falha ao gravar o lote", e);
    return Response.json({ erro: "Erro ao gravar o lote." }, { status: 500 });
  }
}
