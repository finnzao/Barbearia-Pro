"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Avatar, Badge, Card, ListItem, MetricCard, Money } from "@/ds/components";
import { Icon } from "@/ds/icons";
import { agendamentos, resumoHoje } from "@/lib/mock-data";
import { CONFIG_REPASSE_PADRAO, lerRepasse, pendenciasRepasse, type ConfigRepasse } from "@/lib/repasse";

type Metodo = "pix_dinamico" | "pix_estatico" | "dinheiro" | "cartao";

const railPorStatus: Record<string, string> = {
  confirmado: "var(--blue-line)",
  pendente: "var(--amber-line)",
  concluido: "var(--green-line)",
  cancelado: "var(--red-line)",
};

const metodos: Metodo[] = ["pix_dinamico", "pix_estatico", "dinheiro", "cartao"];

const metodoLabel: Record<Metodo, string> = {
  pix_dinamico: "Pix dinâmico",
  pix_estatico: "Pix fixo",
  dinheiro: "Dinheiro",
  cartao: "Cartão",
};

const DIA_SEMANA: Record<number, string> = {
  0: "domingo",
  1: "segunda",
  2: "terça",
  3: "quarta",
  4: "quinta",
  5: "sexta",
  6: "sábado",
};

const SEMANA = [
  { dia: "sáb", valor: 1620 },
  { dia: "dom", valor: 0 },
  { dia: "seg", valor: 980 },
  { dia: "ter", valor: 1240 },
  { dia: "qua", valor: 760 },
  { dia: "qui", valor: 1510 },
  { dia: "sex", valor: 1320, hoje: true },
];

function recebidosPorMetodo() {
  const recebidos = agendamentos.filter((a) => a.status === "concluido");
  const acc = metodos.map((m) => ({ metodo: m, valor: 0 }));
  recebidos.forEach((a, i) => {
    acc[i % metodos.length].valor += a.preco;
  });
  return acc;
}

function textoRepasse(cfg: ConfigRepasse): string {
  if (!cfg.automatico) return "Desligado";
  if (cfg.frequencia === "mensal") return `Todo dia ${cfg.dia}`;
  if (cfg.frequencia === "semanal") return `Toda ${DIA_SEMANA[cfg.dia]}`;
  return `Quinzenal · ${DIA_SEMANA[cfg.dia]}`;
}

export default function VisaoGeral() {
  const [cfg, setCfg] = useState<ConfigRepasse>(CONFIG_REPASSE_PADRAO);

  useEffect(() => {
    setCfg(lerRepasse());
  }, []);

  const r = resumoHoje();
  const comissoes = [...r.comissoes].sort((a, b) => b.comissao - a.comissao);

  const porMetodo = recebidosPorMetodo();
  const totalRecebido = porMetodo.reduce((s, m) => s + m.valor, 0);

  const pendencias = pendenciasRepasse().filter((p) => p.valor > 0);
  const totalARepassar = pendencias.reduce((s, p) => s + p.valor, 0);

  const totalSemana = SEMANA.reduce((s, d) => s + d.valor, 0);
  const abertos = SEMANA.filter((d) => d.valor > 0);
  const mediaSemana = abertos.length ? Math.round(totalSemana / abertos.length) : 0;
  const melhor = abertos.reduce((a, b) => (b.valor > a.valor ? b : a), abertos[0]);
  const maxSemana = Math.max(...SEMANA.map((d) => d.valor), 1);

  return (
    <div className="stack">
      <div className="page-head row-between">
        <div>
          <h1 className="page-title">Visão geral</h1>
          <p className="page-sub">{r.data}</p>
        </div>
        <Link href="/painel/cobranca" className="nr-btn nr-btn--primary nr-btn--md">
          <Icon name="qr" size={18} /> Gerar Pix
        </Link>
      </div>

      <div className="grid-metrics">
        <MetricCard label="Faturamento hoje" value={r.faturamento} money icon={<Icon name="banknote" size={18} />} note="↑ 12% vs ontem" />
        <MetricCard label="Atendimentos" value={r.atendimentos} icon={<Icon name="scissors" size={18} />} note={`${r.proximos.length} ainda na fila`} />
        <MetricCard label="Ticket médio" value={r.ticketMedio} money icon={<Icon name="trendingUp" size={18} />} note="↑ 4% no mês" />
        <MetricCard label="Comissões a pagar" value={r.comissoesApagar} money accent icon={<Icon name="users" size={18} />} note={`${r.comissoes.length} profissionais`} />
      </div>

      <div className="dash-hero">
        <Card title="Faturamento da semana" action={<Money value={totalSemana} size="sm" />}>
          <div className="chart">
            {SEMANA.map((d) => (
              <div className="chart__col" key={d.dia}>
                <div
                  className={d.hoje ? "chart__bar chart__bar--hoje" : "chart__bar"}
                  style={{ height: `${(d.valor / maxSemana) * 100}%` }}
                />
                <span className="chart__lbl">{d.dia}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Resumo da semana">
          <div>
            <div className="kpi">
              <span className="kpi__lbl">Total</span>
              <Money value={totalSemana} size="md" />
            </div>
            <div className="kpi">
              <span className="kpi__lbl">Média por dia aberto</span>
              <Money value={mediaSemana} size="sm" />
            </div>
            <div className="kpi">
              <span className="kpi__lbl">Melhor dia · {melhor.dia}</span>
              <Money value={melhor.valor} size="sm" />
            </div>
            <div className="kpi">
              <span className="kpi__lbl">vs. semana passada</span>
              <span className="trend trend--up">
                <Icon name="trendingUp" size={13} /> 8%
              </span>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid-2">
        <Card title="Próximos atendimentos" action={<span className="muted">{r.proximos.length} na fila</span>}>
          {r.proximos.length > 0 ? (
            <div>
              {r.proximos.map((a) => (
                <ListItem
                  key={a.id}
                  time={a.hora}
                  railColor={railPorStatus[a.status]}
                  leading={<Avatar name={a.cliente} size="sm" />}
                  title={a.cliente}
                  subtitle={`${a.servico} · ${a.profissional}`}
                  trailing={
                    <>
                      <Money value={a.preco} size="sm" />
                      <Badge status={a.status} size="sm" />
                    </>
                  }
                  divided
                />
              ))}
            </div>
          ) : (
            <p className="muted">Nenhum atendimento à frente hoje.</p>
          )}
        </Card>

        <Card title="Recebimentos por método" action={<Money value={totalRecebido} size="sm" />}>
          <div className="stack-sm">
            {porMetodo.map((m) => (
              <div key={m.metodo}>
                <div className="row-between" style={{ marginBottom: 4 }}>
                  <span>{metodoLabel[m.metodo]}</span>
                  <Money value={m.valor} size="sm" />
                </div>
                <div style={{ height: 6, borderRadius: 999, background: "var(--border-subtle)" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${totalRecebido > 0 ? (m.valor / totalRecebido) * 100 : 0}%`,
                      borderRadius: 999,
                      background: "var(--brass-400)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid-2">
        <Card
          title="Comissões do dia"
          footer={
            <Link href="/painel/pagamentos#comissoes" className="muted" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Icon name="arrowRight" size={15} /> Ver detalhe
            </Link>
          }
        >
          <div>
            {comissoes.map((c) => (
              <ListItem
                key={c.profissionalId}
                leading={<Avatar name={c.profissional} size="sm" />}
                title={c.profissional}
                subtitle={`${c.atendimentos} atendimentos`}
                trailing={<Money value={c.comissao} size="sm" />}
                divided
              />
            ))}
          </div>
        </Card>

        <Card
          title="Repasse"
          footer={
            <Link href="/painel/pagamentos#repasses" className="muted" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Icon name="arrowRight" size={15} /> Ver repasses
            </Link>
          }
        >
          <div className="stack-sm">
            <div className="row-between">
              <span className="muted">A repassar</span>
              <Money value={totalARepassar} size="lg" />
            </div>
            <div className="row-between">
              <span className="muted">Repasse automático</span>
              <span>{textoRepasse(cfg)}</span>
            </div>
            <div className="row-between">
              <span className="muted">Profissionais a receber</span>
              <span>{pendencias.length}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
