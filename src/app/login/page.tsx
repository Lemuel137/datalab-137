import { LoginForm } from "./login-form";

type Props = { searchParams: Promise<{ de?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { de } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-col gap-6 px-4 py-24">
      <header>
        <p className="text-xs uppercase tracking-widest text-zinc-500">Datalab137</p>
        <h1 className="text-2xl font-semibold">Prospecção</h1>
      </header>
      <LoginForm de={de && de.startsWith("/") ? de : "/"} />
    </main>
  );
}
