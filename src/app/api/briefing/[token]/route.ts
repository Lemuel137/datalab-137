import { revalidatePath } from "next/cache";
import { briefingSaveSchema } from "@/contracts/briefing";
import { saveBriefing } from "@/domains/briefings/briefings";

const MAX_BYTES = 100_000;

// Rota pública: quem responde não tem login. O token do endereço é a chave, e o
// proxy só libera este caminho exato (isPublicRequest em src/proxy.ts).
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BYTES) {
    return Response.json({ erro: "Texto grande demais." }, { status: 413 });
  }
  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > MAX_BYTES) {
    return Response.json({ erro: "Texto grande demais." }, { status: 413 });
  }
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return Response.json({ erro: "Pedido inválido." }, { status: 400 });
  }
  const parsed = briefingSaveSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ erro: "Alguma resposta passou de 4.000 caracteres." }, { status: 400 });
  }
  const r = await saveBriefing(token, parsed.data.answers, parsed.data.submit);
  if (r.ok) revalidatePath("/briefings");
  return Response.json(r.ok ? { mensagem: r.message } : { erro: r.message }, { status: r.status });
}
