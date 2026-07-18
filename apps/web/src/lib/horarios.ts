export type DiaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface HorarioDia {
  aberto: boolean;
  abre: string; // "HH:MM"
  fecha: string;
  // Pausa recorrente (almoço). Só vale com temPausa ligado.
  temPausa: boolean;
  pausaInicio: string;
  pausaFim: string;
}

export type HorarioSemana = Record<DiaSemana, HorarioDia>;

// Ordem de exibição começando na segunda; domingo por último.
export const DIAS: { id: DiaSemana; nome: string }[] = [
  { id: 1, nome: "Segunda" },
  { id: 2, nome: "Terça" },
  { id: 3, nome: "Quarta" },
  { id: 4, nome: "Quinta" },
  { id: 5, nome: "Sexta" },
  { id: 6, nome: "Sábado" },
  { id: 0, nome: "Domingo" },
];

const SEM_PAUSA = { temPausa: false, pausaInicio: "12:00", pausaFim: "13:00" };

const aberto = (abre: string, fecha: string): HorarioDia => ({
  aberto: true,
  abre,
  fecha,
  ...SEM_PAUSA,
});
export const DIA_FECHADO: HorarioDia = {
  aberto: false,
  abre: "09:00",
  fecha: "18:00",
  ...SEM_PAUSA,
};

export const HORARIO_PADRAO: HorarioSemana = {
  0: DIA_FECHADO,
  1: aberto("09:00", "19:00"),
  2: aberto("09:00", "19:00"),
  3: aberto("09:00", "19:00"),
  4: aberto("09:00", "19:00"),
  5: aberto("09:00", "20:00"),
  6: aberto("09:00", "18:00"),
};
