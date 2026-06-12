import { PageHeader } from "@/components/page-header";
import { getServicos } from "@/lib/api";
import { brl } from "@/lib/format";

export default async function ServicosPage() {
  const lista = await getServicos();

  return (
    <div>
      <PageHeader titulo="Serviços" descricao="Tabela de preços" />

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
        <ul className="divide-y divide-stone-100">
          {lista.map((s) => (
            <li
              key={s.id}
              className="flex items-center gap-4 px-4 py-4 sm:px-5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-stone-900">
                  {s.nome}
                </p>
                <p className="text-xs text-stone-500">{s.duracaoMin} min</p>
              </div>
              <span className="font-mono text-sm font-semibold tabular-nums text-stone-900">
                {brl(s.preco)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
