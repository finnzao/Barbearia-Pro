// ---------------------------------------------------------------------------
// A grade de horários é fixa (a barbearia trabalha em janelas de 30 min, com
// parada para o almoço) — usada pelas telas reais de agenda/calendário junto
// com dados vindos da API. Não é dado fake: é config de UI.
// ---------------------------------------------------------------------------
export const GRADE_DIA: string[] = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00",
];

// Tipo de retorno de GET /relatorios/picos (analise/relatorios usam só o tipo,
// os dados reais vêm da API — ver getPicos em lib/api.ts).
export interface AnaliseSemana {
  dias: import("./types").CortesDia[];
  maisMovimentado: import("./types").CortesDia;
  menosMovimentado: import("./types").CortesDia;
  totalCortes: number;
}
