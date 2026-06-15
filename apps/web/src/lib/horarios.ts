export type DiaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface HorarioDia {
  aberto: boolean;
  abre: string; // "HH:MM"
  fecha: string;
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

const aberto = (abre: string, fecha: string): HorarioDia => ({ aberto: true, abre, fecha });
const fechado: HorarioDia = { aberto: false, abre: "09:00", fecha: "18:00" };

export const HORARIO_PADRAO: HorarioSemana = {
  0: fechado,
  1: aberto("09:00", "19:00"),
  2: aberto("09:00", "19:00"),
  3: aberto("09:00", "19:00"),
  4: aberto("09:00", "19:00"),
  5: aberto("09:00", "20:00"),
  6: aberto("09:00", "18:00"),
};

// Persistência provisória no navegador, igual a settings.ts. Quando a API
// existir, vira GET/PUT em horario_funcionamento.
const CHAVE = "naregua:horario-funcionamento";

export function lerHorario(): HorarioSemana {
  if (typeof window === "undefined") return HORARIO_PADRAO;
  try {
    const cru = window.localStorage.getItem(CHAVE);
    if (!cru) return HORARIO_PADRAO;
    return { ...HORARIO_PADRAO, ...JSON.parse(cru) };
  } catch {
    return HORARIO_PADRAO;
  }
}

export function salvarHorario(horario: HorarioSemana): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CHAVE, JSON.stringify(horario));
}
