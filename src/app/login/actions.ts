"use server";

import { redirect } from "next/navigation";
import { senhaConfere } from "@/domains/auth/password";
import { criarSessao, encerrarSessao } from "@/domains/auth/session";

export type LoginState = { ok: boolean; message: string } | undefined;

export async function entrar(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const senha = String(formData.get("senha") ?? "");
  const de = String(formData.get("de") ?? "/");

  if (!senhaConfere(senha)) {
    return { ok: false, message: "Senha incorreta." };
  }

  await criarSessao("lemuel");
  redirect(de.startsWith("/") && !de.startsWith("//") ? de : "/");
}

export async function sair() {
  await encerrarSessao();
  redirect("/login");
}
