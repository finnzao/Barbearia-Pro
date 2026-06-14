"use client";

import { useMemo, useState } from "react";
import { Calendario } from "@/components/calendario";
import { Badge, Card } from "@/ds/components";
import { ocupacaoMes, slotsDoDia } from "@/lib/mock-data";

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export default function CalendarioPage() {
  // Mês exibido fixo no contexto do app (junho/2026); o "hoje" acompanha o dia atual.
  const ano = 2026;
  const mes = 5;
  const hoje = 13;

  const ocupacao = useMemo(() => ocupacaoMes(ano, mes), [ano, mes]);
  const [dia, setDia] = useState<number>(hoje);

  const slots = slotsDoDia(ano, mes, dia);
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
