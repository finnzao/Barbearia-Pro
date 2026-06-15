import { redirect } from "next/navigation";

// Comissões agora vive como aba dentro de Pagamentos.
export default function Comissoes() {
  redirect("/painel/pagamentos#comissoes");
}
