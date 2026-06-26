"use client";

import { useEffect, useState } from "react";
import { BarChart } from "@/components/bar-chart";
import { Card, MetricCard, Money } from "@/ds/components";
import { Icon } from "@/ds/icons";
import { getPicos } from "@/lib/api";
import type { AnaliseSemana } from "@/lib/mock-data";
import type { CortesDia, FaixaHora } from "@/lib/types";

const NOME_COMPLETO: Record<string, string> = {
  Seg: "Segunda", Ter: "Terça", Qua: "Quarta", Qui: "Quinta",
  Sex: "Sexta", Sáb: "Sábado", Dom: "Domingo",
};

const DIA_VAZIO: CortesDia = { dia: "", cortes: 0, faturamento: 0 };
const SEMANA_VAZIA: AnaliseSemana = {
  dias: [],
  maisMovimentado: DIA_VAZIO,
  menosMovimentado: DIA_VAZIO,
  totalCortes: 0,
};

export default function Analise() {
  const [a, setA] = useState<AnaliseSemana>(SEMANA_VAZIA);
  const [horas, setHoras] = useState<FaixaHora[]>([]);

  useEffect(() => {
    getPicos()
      .then((p) => {
        setA(p.analise);
        setHoras(p.horas);
      })
      .catch(() => {});
  }, []);

  const horaPico = horas.length
    ? horas.reduce((m, h) => (h.cortes > m.cortes ? h : m), horas[0])
    : { hora: "—", cortes: 0 };
  const faturamentoSemana = a.dias.reduce((s, d) => s + d.faturamento, 0);

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1 className="page-title">Análise</h1>
          <p className="page-sub">Padrão de movimento da última semana</p>
        </div>
      </div>

      <div className="grid-metrics">
        <MetricCard label="Cortes na semana" value={a.totalCortes} icon={<Icon name="scissors" size={18} />} />
        <MetricCard label="Dia mais movimentado" value={a.maisMovimentado.cortes} accent icon={<Icon name="trendingUp" size={18} />} note={`${NOME_COMPLETO[a.maisMovimentado.dia]} · cortes`} />
        <MetricCard label="Dia mais fraco" value={a.menosMovimentado.cortes} icon={<Icon name="trendingUp" size={18} />} note={`${NOME_COMPLETO[a.menosMovimentado.dia]} · cortes`} />
        <MetricCard label="Faturamento da semana" value={faturamentoSemana} money icon={<Icon name="banknote" size={18} />} />
      </div>

      <Card title="Cortes por dia da semana">
        <BarChart data={a.dias.map((d) => ({ label: d.dia, value: d.cortes }))} accentMax markMin />
        <div className="legend">
          <span className="legend__item"><span className="legend__swatch" style={{ background: "var(--brass-500)" }} /> Pico — {NOME_COMPLETO[a.maisMovimentado.dia]}</span>
          <span className="legend__item"><span className="legend__swatch" style={{ background: "var(--stone-300)" }} /> Mais fraco — {NOME_COMPLETO[a.menosMovimentado.dia]}</span>
        </div>
      </Card>

      <Card title="Concentração por horário" action={<span className="muted">Pico às {horaPico.hora}</span>}>
        <BarChart data={horas.map((h) => ({ label: h.hora, value: h.cortes }))} accentMax />
        <p className="muted" style={{ marginTop: "var(--space-5)" }}>
          O fim de tarde concentra a maior demanda. Use isso para escalar mais profissionais entre 16h e 18h.
        </p>
      </Card>
    </div>
  );
}
