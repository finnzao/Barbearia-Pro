"use client";

import { useMemo, useState } from "react";
import { Avatar, Card, ListItem, Money, Tabs } from "@/ds/components";
import { pct } from "@/lib/format";
import { comissoesPorPeriodo } from "@/lib/mock-data";
import type { Periodo } from "@/lib/types";

const ABAS = [
  { id: "dia", label: "Hoje" },
  { id: "semana", label: "Semana" },
  { id: "mes", label: "Mês" },
];

export default function Comissoes() {
  const [periodo, setPeriodo] = useState<Periodo>("dia");
  const linhas = useMemo(() => comissoesPorPeriodo(periodo), [periodo]);
  const total = linhas.reduce((soma, c) => soma + c.comissao, 0);

  return (
    <div className="stack">
      <div className="page-head row-between">
        <div>
          <h1 className="page-title">Comissões</h1>
          <p className="page-sub">Repasse calculado sobre atendimentos concluídos</p>
        </div>
        <Tabs items={ABAS} value={periodo} onChange={(id) => setPeriodo(id as Periodo)} />
      </div>

      <Card
        title="A pagar"
        action={<Money value={total} size="md" />}
        footer={<span className="muted">Baixa automática lança a comissão no caixa a cada Pix recebido.</span>}
      >
        <div>
          {linhas.map((c) => (
            <ListItem
              key={c.profissionalId}
              leading={<Avatar name={c.profissional} />}
              title={c.profissional}
              subtitle={`${c.atendimentos} atendimentos · faturou `}
              trailing={
                <>
                  <span className="muted" style={{ fontFamily: "var(--font-mono)" }}>{pct(c.comissaoPercent)}</span>
                  <Money value={c.comissao} size="sm" />
                </>
              }
              divided
            />
          ))}
        </div>
      </Card>
    </div>
  );
}
