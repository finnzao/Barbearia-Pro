"use client";

import { useMemo, useState } from "react";
import { BarChart } from "@/components/bar-chart";
import { Avatar, Badge, Card, Money, Row, Seg, brl } from "@/app/painel/ui";
import { METODO_PAGAMENTO_LABEL } from "@/lib/pagamento";
import {
  analiseSemana,
  clientesRecorrentes,
  cortesPorHora,
  faturamentoMensal,
  formasPagamento,
  receitaPorProfissional,
  relatorioFinanceiro,
  servicosRealizados,
} from "@/lib/mock-data";
import type { Periodo } from "@/lib/types";

const ABAS_PERIODO = [
  { id: "dia", label: "Hoje" },
  { id: "semana", label: "Semana" },
  { id: "mes", label: "Mês" },
];

const SUB_PERIODO: Record<Periodo, string> = {
  dia: "no dia de hoje",
  semana: "na semana",
  mes: "no mês",
};

const NOME_DIA: Record<string, string> = {
  Seg: "Segunda", Ter: "Terça", Qua: "Quarta", Qui: "Quinta",
  Sex: "Sexta", Sáb: "Sábado", Dom: "Domingo",
};

function Meter({ value, max, soft }: { value: number; max: number; soft?: boolean }) {
  const largura = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0;
  return (
    <div className={soft ? "rep-bar rep-bar--soft" : "rep-bar"}>
      <span style={{ width: `${largura}%` }} />
    </div>
  );
}

export default function Relatorios() {
  const [periodo, setPeriodo] = useState<Periodo>("semana");

  const fin = useMemo(() => relatorioFinanceiro(periodo), [periodo]);
  const receitas = useMemo(() => receitaPorProfissional(periodo), [periodo]);
  const servicos = useMemo(() => servicosRealizados(periodo), [periodo]);
  const formas = useMemo(() => formasPagamento(periodo), [periodo]);

  // Painéis de contexto: grão próprio (semana / 6 meses), não seguem o seletor.
  const clientes = useMemo(() => clientesRecorrentes(), []);
  const evolucao = useMemo(() => faturamentoMensal(), []);
  const semana = useMemo(() => analiseSemana(), []);
  const horas = useMemo(() => cortesPorHora(), []);

  const maxReceita = Math.max(...receitas.map((r) => r.receita), 1);
  const maxComissao = Math.max(...receitas.map((r) => r.comissao), 1);
  const maxServico = Math.max(...servicos.map((s) => s.quantidade), 1);
  const maxForma = Math.max(...formas.map((f) => f.total), 1);
  const maxCliente = Math.max(...clientes.map((c) => c.visitas), 1);

  const maisServico = servicos[0];
  const menosServico = servicos[servicos.length - 1];
  const horaPico = horas.reduce((m, h) => (h.cortes > m.cortes ? h : m), horas[0]);
  const totalComissoes = receitas.reduce((s, r) => s + r.comissao, 0);

  return (
    <div className="pn-page">
      <div className="pn-pagehead row-between">
        <div>
          <h1 className="pn-h1">Relatórios</h1>
          <p className="pn-sub">Visão financeira e operacional da barbearia.</p>
        </div>
        <Seg items={ABAS_PERIODO} value={periodo} onChange={(id) => setPeriodo(id as Periodo)} />
      </div>

      <p className="pn-note">
        O período ajusta os indicadores financeiros e os rankings de receita, serviços e formas de
        pagamento. Recorrência de clientes, evolução mensal e picos de movimento mostram padrões de
        referência e não mudam com o seletor.
      </p>

      {/* Indicadores financeiros do período selecionado. */}
      <div className="pn-sumstrip">
        <div className="pn-sum">
          <span className="pn-sum__lbl">Faturamento {SUB_PERIODO[periodo]}</span>
          <div className="pn-sum__num">{brl(fin.faturamento)}</div>
        </div>
        <div className="pn-sum">
          <span className="pn-sum__lbl">Líquido (após comissões)</span>
          <div className="pn-sum__num pn-sum__num--accent">{brl(fin.liquido)}</div>
        </div>
        <div className="pn-sum">
          <span className="pn-sum__lbl">Ticket médio</span>
          <div className="pn-sum__num">{brl(fin.ticketMedio)}</div>
        </div>
        <div className="pn-sum">
          <span className="pn-sum__lbl">Atendimentos</span>
          <div className="pn-sum__num">{fin.atendimentos}</div>
        </div>
      </div>

      <Card
        title="Evolução do faturamento"
        action={<span className="pn-note">últimos 6 meses · em milhares</span>}
      >
        <BarChart
          data={evolucao.map((m) => ({ label: m.mes, value: Math.round(m.faturamento / 1000) }))}
          unidade="k"
          accentMax
        />
      </Card>

      <div className="grid-2">
        <Card
          title="Receita por profissional"
          action={<Money value={fin.faturamento} size="md" />}
          footer={`Líquido após comissões ${SUB_PERIODO[periodo]}: ${brl(fin.liquido)}.`}
        >
          <div className="pn-list">
            {receitas.map((r) => (
              <Row
                key={r.profissionalId}
                leading={<Avatar name={r.profissional} size="sm" />}
                title={r.profissional}
                subtitle={`${r.atendimentos} atendimentos`}
                trailing={
                  <div className="rep-meter">
                    <div className="rep-meter__top">
                      <span className="pn-note">líquido {brl(r.liquido)}</span>
                      <Money value={r.receita} size="sm" />
                    </div>
                    <Meter value={r.receita} max={maxReceita} />
                  </div>
                }
              />
            ))}
          </div>
        </Card>

        <Card
          title="Comissões por profissional"
          action={<Money value={totalComissoes} size="md" />}
          footer="Quanto cada profissional recebe pelos atendimentos pagos."
        >
          <div className="pn-list">
            {receitas.map((r) => (
              <Row
                key={r.profissionalId}
                leading={<Avatar name={r.profissional} size="sm" />}
                title={r.profissional}
                subtitle={`${r.atendimentos} atendimentos`}
                trailing={
                  <div className="rep-meter">
                    <div className="rep-meter__top">
                      <span className="pn-note">comissão</span>
                      <Money value={r.comissao} size="sm" />
                    </div>
                    <Meter value={r.comissao} max={maxComissao} soft />
                  </div>
                }
              />
            ))}
          </div>
        </Card>
      </div>

      <Card title="Serviços realizados" action={<span className="pn-note">{SUB_PERIODO[periodo]}</span>}>
        <div className="rep-highlights">
          <div className="rep-highlight">
            <span className="rep-highlight__lbl">Mais realizado</span>
            <span className="rep-highlight__val">{maisServico.servico}</span>
            <span className="rep-highlight__note">{maisServico.quantidade} atendimentos · {brl(maisServico.receita)}</span>
          </div>
          <div className="rep-highlight">
            <span className="rep-highlight__lbl">Menos realizado</span>
            <span className="rep-highlight__val">{menosServico.servico}</span>
            <span className="rep-highlight__note">{menosServico.quantidade} atendimentos · {brl(menosServico.receita)}</span>
          </div>
        </div>
        <div className="pn-list">
          {servicos.map((s) => (
            <Row
              key={s.servico}
              title={s.servico}
              subtitle={`${s.quantidade} realizados`}
              trailing={
                <div className="rep-meter">
                  <div className="rep-meter__top">
                    <span className="pn-note">{brl(s.receita)}</span>
                  </div>
                  <Meter value={s.quantidade} max={maxServico} />
                </div>
              }
            />
          ))}
        </div>
      </Card>

      <div className="grid-2">
        <Card title="Formas de pagamento" footer={`Distribuição do que entrou ${SUB_PERIODO[periodo]}.`}>
          <div className="pn-list">
            {formas.map((f) => (
              <Row
                key={f.metodo}
                title={METODO_PAGAMENTO_LABEL[f.metodo]}
                subtitle={`${f.quantidade} transações`}
                trailing={
                  <div className="rep-meter">
                    <div className="rep-meter__top">
                      <span className="pn-note">total</span>
                      <Money value={f.total} size="sm" />
                    </div>
                    <Meter value={f.total} max={maxForma} />
                  </div>
                }
              />
            ))}
          </div>
        </Card>

        <Card title="Clientes recorrentes" footer="Quem mais volta — base para fidelidade e recompra.">
          <div className="pn-list">
            {clientes.map((c) => (
              <Row
                key={c.cliente}
                leading={<Avatar name={c.cliente} size="sm" />}
                title={c.cliente}
                subtitle={`${c.visitas} visitas`}
                trailing={
                  <div className="rep-meter">
                    <div className="rep-meter__top">
                      <span className="pn-note">gasto</span>
                      <Money value={c.total} size="sm" />
                    </div>
                    <Meter value={c.visitas} max={maxCliente} soft />
                  </div>
                }
              />
            ))}
          </div>
        </Card>
      </div>

      <Card
        title="Dias de maior movimento"
        action={<span className="pn-note">pico: {NOME_DIA[semana.maisMovimentado.dia]}</span>}
      >
        <BarChart data={semana.dias.map((d) => ({ label: d.dia, value: d.cortes }))} accentMax markMin />
        <div className="legend">
          <span className="legend__item">
            <span className="legend__swatch" style={{ background: "var(--brass-500)" }} /> Pico — {NOME_DIA[semana.maisMovimentado.dia]}
          </span>
          <span className="legend__item">
            <span className="legend__swatch" style={{ background: "var(--stone-300)" }} /> Mais fraco — {NOME_DIA[semana.menosMovimentado.dia]}
          </span>
        </div>
      </Card>

      <Card title="Horários de maior movimento" action={<Badge tone="brass">Pico às {horaPico.hora}</Badge>}>
        <BarChart data={horas.map((h) => ({ label: h.hora, value: h.cortes }))} accentMax />
        <p className="pn-note" style={{ marginTop: "var(--sp-2)" }}>
          O fim de tarde concentra a maior demanda. Reforce a equipe entre 16h e 18h para reduzir a fila.
        </p>
      </Card>
    </div>
  );
}
