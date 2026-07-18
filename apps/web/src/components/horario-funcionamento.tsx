"use client";

import { useEffect, useState } from "react";
import { Button, Switch } from "@/ds/components";
import { Icon } from "@/ds/icons";
import { getHorarios, salvarHorarios } from "@/lib/api";
import {
  DIAS,
  HORARIO_PADRAO,
  type DiaSemana,
  type HorarioDia,
  type HorarioSemana,
} from "@/lib/horarios";

export function HorarioFuncionamento() {
  const [horario, setHorario] = useState<HorarioSemana>(HORARIO_PADRAO);
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    getHorarios()
      .then(setHorario)
      .catch(() => setHorario(HORARIO_PADRAO));
  }, []);

  const atualizar = (dia: DiaSemana, patch: Partial<HorarioDia>) => {
    setHorario((atual) => ({ ...atual, [dia]: { ...atual[dia], ...patch } }));
    setSalvo(false);
  };

  const salvar = async () => {
    setErro(null);
    try {
      await salvarHorarios(horario);
      setSalvo(true);
    } catch (e) {
      // A API valida a pausa (dentro do expediente, fim > início): sem isto o
      // dono clicaria em salvar e nada aconteceria, sem explicação.
      setErro(e instanceof Error ? e.message : "Não foi possível salvar.");
    }
  };

  return (
    <div className="stack-sm">
      {DIAS.map(({ id, nome }) => {
        const dia = horario[id];
        return (
          <div key={id}>
            <div className="horario-row">
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
            {dia.aberto && (
              <div className="horario-row horario-row--pausa">
                <span className="horario-row__dia horario-row__pausa-label">Almoço</span>
                <Switch
                  checked={dia.temPausa}
                  onChange={(e) => atualizar(id, { temPausa: e.target.checked })}
                />
                {dia.temPausa ? (
                  <div className="horario-row__faixa">
                    <input
                      type="time"
                      className="horario-row__time"
                      value={dia.pausaInicio}
                      onChange={(e) => atualizar(id, { pausaInicio: e.target.value })}
                    />
                    <span className="horario-row__sep">às</span>
                    <input
                      type="time"
                      className="horario-row__time"
                      value={dia.pausaFim}
                      onChange={(e) => atualizar(id, { pausaFim: e.target.value })}
                    />
                  </div>
                ) : (
                  <span className="horario-row__fechado">Sem pausa</span>
                )}
              </div>
            )}
          </div>
        );
      })}
      {erro && <p className="muted">{erro}</p>}
      <div className="row-between">
        <span className="muted">
          Dia desligado fica fechado. A pausa some da grade do cliente.
        </span>
        <Button variant="accent" size="sm" iconLeft={<Icon name="check" size={16} />} onClick={salvar}>
          {salvo ? "Salvo" : "Salvar horário"}
        </Button>
      </div>
    </div>
  );
}
