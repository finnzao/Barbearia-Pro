import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { getResumoHoje } from "@/lib/api";
import { brl, pct } from "@/lib/format";

export default async function PainelPage() {
  const r = await getResumoHoje();

  return (
    <div>
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">
          Hoje
        </p>
        <h1 className="text-2xl font-semibold capitalize tracking-tight text-stone-900">
          {r.data}
        </h1>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Faturamento" value={brl(r.faturamento)} />
        <StatCard label="Atendimentos" value={String(r.atendimentos)} />
        <StatCard label="Ticket médio" value={brl(r.ticketMedio)} />
        <StatCard
          label="Comissões"
          value={brl(r.comissoesApagar)}
          hint="a pagar hoje"
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-5">
        {/* Próximos agendamentos */}
        <section className="lg:col-span-3">
          <h2 className="mb-3 text-sm font-semibold text-stone-900">
            Próximos agendamentos
          </h2>
          <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
            {r.proximos.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-stone-500">
                Nada agendado pelo resto do dia.
              </p>
            ) : (
              <ul className="divide-y divide-stone-100">
                {r.proximos.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center gap-4 px-5 py-3.5"
                  >
                    <span className="font-mono text-sm font-medium tabular-nums text-stone-900">
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
                    <StatusBadge status={a.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Comissão por profissional */}
        <section className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-stone-900">
            Comissão por profissional
          </h2>
          <div className="rounded-xl border border-stone-200 bg-white p-2">
            <ul className="divide-y divide-stone-100">
              {r.comissoes.map((c) => (
                <li
                  key={c.profissionalId}
                  className="flex items-center justify-between px-3 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-stone-900">
                      {c.profissional}
                    </p>
                    <p className="text-xs text-stone-500">
                      {c.atendimentos} atend. · {pct(c.comissaoPercent)}
                    </p>
                  </div>
                  <span className="font-mono text-sm font-semibold tabular-nums text-stone-900">
                    {brl(c.comissao)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
