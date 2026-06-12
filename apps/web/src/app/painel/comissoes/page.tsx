"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { comissoesPorPeriodo } from "@/lib/mock-data";
import { brl, pct } from "@/lib/format";
import type { Periodo } from "@/lib/types";

const opcoes: { valor: Periodo; rotulo: string }[] = [
  { valor: "dia", rotulo: "Dia" },
  { valor: "semana", rotulo: "Semana" },
  { valor: "mes", rotulo: "Mês" },
];

export default function ComissoesPage() {
  const [periodo, setPeriodo] = useState<Periodo>("dia");
  const linhas = comissoesPorPeriodo(periodo);
  const total = linhas.reduce((s, l) => s + l.comissao, 0);
  const faturado = linhas.reduce((s, l) => s + l.faturado, 0);

  return (
    <div>
      <PageHeader
        titulo="Comissões"
        descricao="Quanto cada profissional tem a receber"
      />

      <div className="mb-4 inline-flex rounded-lg border border-stone-200 bg-white p-1">
        {opcoes.map((o) => (
          <button
            key={o.valor}
            onClick={() => setPeriodo(o.valor)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              periodo === o.valor
                ? "bg-stone-900 text-white"
                : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            {o.rotulo}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wider text-stone-500">
              <th className="px-4 py-3 font-semibold sm:px-5">Profissional</th>
              <th className="px-4 py-3 text-right font-semibold">Atend.</th>
              <th className="hidden px-4 py-3 text-right font-semibold sm:table-cell">
                Faturado
              </th>
              <th className="px-4 py-3 text-right font-semibold">%</th>
              <th className="px-4 py-3 text-right font-semibold sm:px-5">
                Comissão
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {linhas.map((l) => (
              <tr key={l.profissionalId}>
                <td className="px-4 py-3.5 font-medium text-stone-900 sm:px-5">
                  {l.profissional}
                </td>
                <td className="px-4 py-3.5 text-right font-mono tabular-nums text-stone-700">
                  {l.atendimentos}
                </td>
                <td className="hidden px-4 py-3.5 text-right font-mono tabular-nums text-stone-700 sm:table-cell">
                  {brl(l.faturado)}
                </td>
                <td className="px-4 py-3.5 text-right font-mono tabular-nums text-stone-700">
                  {pct(l.comissaoPercent)}
                </td>
                <td className="px-4 py-3.5 text-right font-mono font-semibold tabular-nums text-stone-900 sm:px-5">
                  {brl(l.comissao)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-stone-200 bg-stone-50">
              <td className="px-4 py-3.5 text-sm font-semibold text-stone-900 sm:px-5">
                Total
              </td>
              <td />
              <td className="hidden px-4 py-3.5 text-right font-mono text-sm tabular-nums text-stone-700 sm:table-cell">
                {brl(faturado)}
              </td>
              <td />
              <td className="px-4 py-3.5 text-right font-mono text-sm font-semibold tabular-nums text-amber-700 sm:px-5">
                {brl(total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
