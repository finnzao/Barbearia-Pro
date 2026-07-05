import type { Profissional, Servico } from "./types";

// Dados de demonstração para a tela legada "/agendar" (sem slug) e para o
// simulador de Pix ("Gerar Pix") — ambos aguardando a Fase 5 (Pix real via
// PSP) para deixar de ser decorativos. Ver regras-de-negocio.md, RN-21/22/23.
// Nada aqui deve alimentar telas que já falam com a API real.

export const profissionais: Profissional[] = [
  { id: "p1", nome: "Téo Andrade", apelido: "Téo", comissaoPercent: 0.5, chavePix: "teo.andrade@pix.com", pixTipoChave: "email", ativo: true },
  { id: "p2", nome: "Rafael Lima", apelido: "Rafa", comissaoPercent: 0.45, chavePix: "rafael.lima@pix.com", pixTipoChave: "email", ativo: true },
  { id: "p3", nome: "Bruno Souza", apelido: "Bruno", comissaoPercent: 0.4, chavePix: "11999990003", pixTipoChave: "telefone", ativo: true },
];

export const servicos: Servico[] = [
  { id: "s1", nome: "Corte + barba", duracaoMin: 45, preco: 8000 },
  { id: "s2", nome: "Corte máquina", duracaoMin: 30, preco: 4500 },
  { id: "s3", nome: "Corte tesoura", duracaoMin: 40, preco: 7000 },
  { id: "s4", nome: "Barba terapia", duracaoMin: 30, preco: 5000 },
  { id: "s5", nome: "Platinado", duracaoMin: 120, preco: 22000 },
];

export const datas = [
  { dw: "Hoje", dd: "13" },
  { dw: "Sáb", dd: "14" },
  { dw: "Seg", dd: "16" },
  { dw: "Ter", dd: "17" },
  { dw: "Qua", dd: "18" },
];

export const horarios: [string, boolean][] = [
  ["09:00", true], ["09:45", false], ["10:30", true],
  ["11:15", true], ["14:00", false], ["14:45", true],
  ["15:30", true], ["16:15", true], ["17:00", false],
];

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
