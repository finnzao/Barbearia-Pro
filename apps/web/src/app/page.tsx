import { redirect } from "next/navigation";

// A raiz não tem tela própria: o ponto de entrada do dono é o painel.
export default function Home() {
  redirect("/painel");
}
