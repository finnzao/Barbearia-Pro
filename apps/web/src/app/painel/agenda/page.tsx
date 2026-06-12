import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { getAgendamentos } from "@/lib/api";
import { brl } from "@/lib/format";

export default async function AgendaPage() {
  const lista = await getAgendamentos();

  return (
    <div>
      <PageHeader titulo="Agenda" descricao="Atendimentos de hoje" />

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
        <ul className="divide-y divide-stone-100">
          {lista.map((a) => (
            <li key={a.id} className="flex items-center gap-4 px-4 py-4 sm:px-5">
              <span className="font-mono text-sm font-semibold tabular-nums text-stone-900">
                {a.hora}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-stone-900">
                  {a.cliente}
                </p>
                <p className="truncate text-xs text-stone-500">
                  {a.servico} · {a.profissional}
                </p>
              </div>
              <span className="hidden font-mono text-sm tabular-nums text-stone-700 sm:block">
                {brl(a.preco)}
              </span>
              <StatusBadge status={a.status} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
