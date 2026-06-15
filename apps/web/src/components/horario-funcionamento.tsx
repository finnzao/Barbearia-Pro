"use client";

import { useEffect, useState } from "react";
import { Button, Switch } from "@/ds/components";
import { Icon } from "@/ds/icons";
import {
  DIAS,
  HORARIO_PADRAO,
  lerHorario,
  salvarHorario,
  type DiaSemana,
  type HorarioDia,
  type HorarioSemana,
} from "@/lib/horarios";

export function HorarioFuncionamento() {
  const [horario, setHorario] = useState<HorarioSemana>(HORARIO_PADRAO);
  const [salvo, setSalvo] = useState(false);

  // localStorage só existe no cliente, então hidrata depois da montagem.
  useEffect(() => {
    setHorario(lerHorario());
  }, []);

  const atualizar = (dia: DiaSemana, patch: Partial<HorarioDia>) => {
    setHorario((atual) => ({ ...atual, [dia]: { ...atual[dia], ...patch } }));
    setSalvo(false);
  };

  const salvar = () => {
    salvarHorario(horario);
    setSalvo(true);
  };

  return (
    <div className="stack-sm">
      {DIAS.map(({ id, nome }) => {
        const dia = horario[id];
        return (
          <div key={id} className="horario-row">
            <span className="horario-row__dia">{nome}</span>
            <Switch checked={dia.aberto} onChange={(e) => atualizar(id, { aberto: e.target.checked })} />
            {dia.aberto ? (
              <div className="horario-row__faixa">
                <input
                  type="time"
                  className="horario-row__time"
                  value={dia.abre}
                  onChange={(e) => atualizar(id, { abre: e.target.value })}
                />
                <span className="horario-row__sep">às</span>
                <input
                  type="time"
                  className="horario-row__time"
                  value={dia.fecha}
                  onChange={(e) => atualizar(id, { fecha: e.target.value })}
                />
              </div>
            ) : (
              <span className="horario-row__fechado">Fechado</span>
            )}
          </div>
        );
      })}
      <div className="row-between">
        <span className="muted">Dia desligado fica fechado para agendamento.</span>
        <Button variant="accent" size="sm" iconLeft={<Icon name="check" size={16} />} onClick={salvar}>
          {salvo ? "Salvo" : "Salvar horário"}
        </Button>
      </div>
    </div>
  );
}
