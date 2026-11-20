import { notFound } from "next/navigation";
import { briefingByToken } from "@/domains/briefings/briefings";
import { BriefingForm } from "./briefing-form";

export const dynamic = "force-dynamic";
// Endereço com token: não deve aparecer em busca nem em histórico de referência.
export const metadata = {
  title: "Briefing de prospecção",
  robots: { index: false, follow: false },
};

export default async function BriefingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const b = await briefingByToken(token);
  if (!b) notFound();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-8">
      <header className="flex flex-col gap-3">
        <p className="text-[17px] font-semibold tracking-tight">
          Datalab<span className="text-brand-text">137</span>
        </p>
        <div>
          <p className="label-caps">Briefing de prospecção · {b.title}</p>
          <h1 className="mt-1 text-[32px] font-semibold leading-9 tracking-tight">
            Quem você quer encontrar
          </h1>
        </div>
        <p className="text-ink-muted">
          São doze perguntas abertas sobre o seu negócio e o cliente que você procura. Não tem
          resposta certa nem opção para marcar: escreva do seu jeito, como falaria numa conversa. É
          com essas respostas que a sua lista de prospecção vai ser montada. Dá para salvar e
          terminar depois, neste mesmo endereço.
        </p>
      </header>
      <BriefingForm token={b.token} initial={b.answers} submitted={Boolean(b.submittedAt)} />
    </main>
  );
}
