import { revalidatePath } from "next/cache";
import { ingestSchema } from "@/contracts/ingest";
import { ingestLeads } from "@/domains/leads/ingest";
import { refuse } from "../auth";

const MAX_BYTES = 2_000_000;

export async function POST(request: Request) {
  const denied = refuse(request);
  if (denied) return denied;

  const raw = await request.text();
  if (raw.length > MAX_BYTES) {
    return Response.json({ erro: "Corpo grande demais (limite de 2 MB)." }, { status: 413 });
  }
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return Response.json({ erro: "Corpo não é JSON." }, { status: 400 });
  }
  const parsed = ingestSchema.safeParse(json);
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    return Response.json({ erro: `${i.path.join(".")}: ${i.message}` }, { status: 400 });
  }

  try {
    const result = await ingestLeads(parsed.data);
    revalidatePath("/fila");
    revalidatePath("/leads");
    return Response.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao gravar.";
    return Response.json({ erro: message }, { status: message.startsWith("Frente") ? 404 : 500 });
  }
}
