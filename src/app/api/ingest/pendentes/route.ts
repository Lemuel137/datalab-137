import { pendingHooks } from "@/domains/leads/ingest";
import { refuse } from "../auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = refuse(request);
  if (denied) return denied;

  const front = new URL(request.url).searchParams.get("front") ?? "";
  if (!/^[a-z0-9-]{2,40}$/.test(front)) {
    return Response.json({ erro: "Informe ?front=<slug>." }, { status: 400 });
  }
  return Response.json({ pendentes: await pendingHooks(front) });
}
