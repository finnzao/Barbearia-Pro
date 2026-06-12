import { PageHeader } from "@/components/page-header";
import { getProfissionais } from "@/lib/api";
import { pct } from "@/lib/format";

export default async function ProfissionaisPage() {
  const lista = await getProfissionais();

  return (
    <div>
      <PageHeader titulo="Profissionais" descricao="Equipe da barbearia" />

      <div className="grid gap-3 sm:grid-cols-2">
        {lista.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-4 rounded-xl border border-stone-200 bg-white p-4"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100 font-semibold text-amber-800">
              {p.iniciais}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-stone-900">
                {p.nome}
              </p>
              <p className="text-xs text-stone-500">{p.apelido}</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-sm font-semibold tabular-nums text-stone-900">
                {pct(p.comissaoPercent)}
              </p>
              <p className="text-[11px] text-stone-500">comissão</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
