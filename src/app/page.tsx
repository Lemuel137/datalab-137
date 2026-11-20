import { redirect } from "next/navigation";

// A fila é a tela de trabalho: quem entra cai nela. A navegação fica na barra do topo.
export default function Home() {
  redirect("/fila");
}
