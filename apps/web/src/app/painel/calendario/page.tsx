"use client";

import { useEffect, useState } from "react";
import { Calendario } from "@/components/calendario";
import { Badge, Card } from "@/ds/components";
import { getAgendamentos, getAgendamentosPeriodo } from "@/lib/api";
import { GRADE_DIA } from "@/lib/mock-data";
import type { DiaOcupacao } from "@/lib/types";

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const CAPACIDADE = 16;
const pad = (n: number) => String(n).padStart(2, "0");

export default function CalendarioPage() {
  const [ref, setRef] = useState({ ano: 2026, mes: 5, hoje: 1 });
  const [dia, setDia] = useState<number>(1);
  const [ocupacao, setOcupacao] = useState<DiaOcupacao[]>([]);
  const [slots, setSlots] = useState<[string, boolean][]>([]);

  const { ano, mes, hoje } = ref;

  useEffect(() => {
    const d = new Date();
    setRef({ ano: d.getFullYear(), mes: d.getMonth(), hoje: d.getDate() });
    setDia(d.getDate());
  }, []);

  useEffect(() => {
    const totalDias = new Date(ano, mes + 1, 0).getDate();
    const de = `${ano}-${pad(mes + 1)}-01`;
    const ate = `${ano}-${pad(mes + 1)}-${pad(totalDias)}`;
    getAgendamentosPeriodo(de, ate)
      .then((ags) => {
        const dias: DiaOcupacao[] = [];
        for (let d = 1; d <= totalDias; d += 1) {
          const cortes = ags.filter((x) => {
            const dt = new Date(x.inicio);
            return (
              dt.getFullYear() === ano &&
              dt.getMonth() === mes &&
              dt.getDate() === d
            );
          }).length;
          dias.push({ dia: d, cortes, capacidade: CAPACIDADE });
        }
        setOcupacao(dias);
      })
      .catch(() => setOcupacao([]));
  }, [ano, mes]);

  useEffect(() => {
    const diaISO = `${ano}-${pad(mes + 1)}-${pad(dia)}`;
    getAgendamentos(diaISO)
      .then((ags) => {
        const ocupadas = new Set(ags.map((a) => a.hora));
        setSlots(
          GRADE_DIA.map((h) => [h, ocupadas.has(h)] as [string, boolean]),
        );
      })
      .catch(() => setSlots([]));
  }, [ano, mes, dia]);

  const ocupadosDia = slots.filter(([, taken]) => taken).length;
  const info = ocupacao.find((o) => o.dia === dia);

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1 className="page-title">Calendário</h1>
          <p className="page-sub">Ocupação de {MESES[mes]} de {ano}</p>
        </div>
      </div>

      <div className="grid-2">
        <Card title={`${MESES[mes]} ${ano}`} action={<span className="muted">barra = % de horários ocupados</span>}>
          <Calendario ano={ano} mes={mes} ocupacao={ocupacao} selecionado={dia} hoje={hoje} onSelect={setDia} />
        </Card>

        <Card
          title={`Dia ${dia}`}
          action={info && info.cortes > 0 ? <Badge tone="brass" size="sm">{ocupadosDia}/{slots.length} ocupados</Badge> : <Badge tone="neutral" size="sm">Fechado</Badge>}
        >
          {info && info.cortes > 0 ? (
            <div className="dayslots">
              {slots.map(([hora, taken]) => (
                <div key={hora} className={taken ? "dayslot dayslot--taken" : "dayslot"}>{hora}</div>
              ))}
            </div>
          ) : (
            <p className="muted">Sem expediente neste dia.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
