import { LoginForm } from "./login-form";

type Props = { searchParams: Promise<{ de?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { de } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-16">
      <header>
        <p className="text-[28px] font-semibold leading-8 tracking-tight">
          Datalab<span className="text-brand-text">137</span>
        </p>
        <h1 className="mt-1 text-sm text-ink-muted">Prospecção: quem abordar hoje, e por quê.</h1>
      </header>
      <div className="card p-6">
        <LoginForm de={de && de.startsWith("/") ? de : "/"} />
      </div>
    </main>
  );
}
