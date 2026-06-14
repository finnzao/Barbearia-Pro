import type {
  Agendamento,
  ComissaoProfissional,
  CortesDia,
  DiaOcupacao,
  FaixaHora,
  Periodo,
  Profissional,
  ResumoHoje,
  Servico,
} from "./types";

// Provisório enquanto não há backend. Quando a API do Nest existir, estas
// funções viram chamadas fetch e os componentes não mudam.

export const profissionais: Profissional[] = [
  { id: "p1", nome: "Téo Andrade", apelido: "Téo", comissaoPercent: 0.5 },
  { id: "p2", nome: "Rafael Lima", apelido: "Rafa", comissaoPercent: 0.45 },
  { id: "p3", nome: "Bruno Souza", apelido: "Bruno", comissaoPercent: 0.4 },
];

export const servicos: Servico[] = [
  { id: "s1", nome: "Corte + barba", duracaoMin: 45, preco: 80 },
  { id: "s2", nome: "Corte máquina", duracaoMin: 30, preco: 45 },
  { id: "s3", nome: "Corte tesoura", duracaoMin: 40, preco: 70 },
  { id: "s4", nome: "Barba terapia", duracaoMin: 30, preco: 50 },
  { id: "s5", nome: "Platinado", duracaoMin: 120, preco: 220 },
];

export const agendamentos: Agendamento[] = [
  { id: "a1", hora: "09:00", cliente: "João Pedro", servico: "Corte + barba", profissionalId: "p1", profissional: "Téo", preco: 80, status: "concluido" },
  { id: "a2", hora: "09:45", cliente: "Marcos V.", servico: "Corte máquina", profissionalId: "p2", profissional: "Rafa", preco: 45, status: "concluido" },
  { id: "a3", hora: "10:30", cliente: "Bruno Dias", servico: "Barba terapia", profissionalId: "p3", profissional: "Bruno", preco: 50, status: "concluido" },
  { id: "a4", hora: "11:15", cliente: "Felipe R.", servico: "Corte tesoura", profissionalId: "p1", profissional: "Téo", preco: 70, status: "concluido" },
  { id: "a5", hora: "14:00", cliente: "Anderson L.", servico: "Platinado", profissionalId: "p2", profissional: "Rafa", preco: 220, status: "confirmado" },
  { id: "a6", hora: "15:30", cliente: "Thiago M.", servico: "Corte + barba", profissionalId: "p3", profissional: "Bruno", preco: 80, status: "confirmado" },
  { id: "a7", hora: "16:15", cliente: "Gabriel S.", servico: "Corte máquina", profissionalId: "p1", profissional: "Téo", preco: 45, status: "pendente" },
  { id: "a8", hora: "17:00", cliente: "Lucas F.", servico: "Barba terapia", profissionalId: "p2", profissional: "Rafa", preco: 50, status: "cancelado" },
];

// ----- Dados do fluxo de agendamento (cliente) -----
export const datas = [
  { dw: "Hoje", dd: "13" },
  { dw: "Sáb", dd: "14" },
  { dw: "Seg", dd: "16" },
  { dw: "Ter", dd: "17" },
  { dw: "Qua", dd: "18" },
];

// [horário, disponível?]
export const horarios: [string, boolean][] = [
  ["09:00", true], ["09:45", false], ["10:30", true],
  ["11:15", true], ["14:00", false], ["14:45", true],
  ["15:30", true], ["16:15", true], ["17:00", false],
];

function calcComissoes(lista: Agendamento[]): ComissaoProfissional[] {
  return profissionais.map((p) => {
    const dele = lista.filter((a) => a.profissionalId === p.id && a.status !== "cancelado");
    const faturado = dele.reduce((soma, a) => soma + a.preco, 0);
    return {
      profissionalId: p.id,
      profissional: p.apelido,
      atendimentos: dele.length,
      faturado,
      comissaoPercent: p.comissaoPercent,
      comissao: Math.round(faturado * p.comissaoPercent),
    };
  });
}

const fator: Record<Periodo, number> = { dia: 1, semana: 6, mes: 26 };

export function comissoesPorPeriodo(periodo: Periodo): ComissaoProfissional[] {
  const f = fator[periodo];
  return calcComissoes(agendamentos).map((c) => ({
    ...c,
    atendimentos: c.atendimentos * f,
    faturado: c.faturado * f,
    comissao: c.comissao * f,
  }));
}

export function resumoHoje(): ResumoHoje {
  const validos = agendamentos.filter((a) => a.status !== "cancelado");
  const faturamento = validos.reduce((soma, a) => soma + a.preco, 0);
  const comissoes = calcComissoes(agendamentos);
  return {
    data: new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }),
    faturamento,
    atendimentos: validos.length,
    ticketMedio: validos.length ? Math.round(faturamento / validos.length) : 0,
    comissoesApagar: comissoes.reduce((soma, c) => soma + c.comissao, 0),
    proximos: agendamentos.filter((a) => a.status === "confirmado" || a.status === "pendente"),
    comissoes,
  };
}

// ===== Painel analítico =====

// Distribuição típica de uma barbearia: forte no fim de semana, fraca no início.
const CORTES_SEMANA: CortesDia[] = [
  { dia: "Seg", cortes: 9, faturamento: 560 },
  { dia: "Ter", cortes: 14, faturamento: 910 },
  { dia: "Qua", cortes: 16, faturamento: 1080 },
  { dia: "Qui", cortes: 19, faturamento: 1290 },
  { dia: "Sex", cortes: 26, faturamento: 1840 },
  { dia: "Sáb", cortes: 31, faturamento: 2210 },
  { dia: "Dom", cortes: 6, faturamento: 380 },
];

export interface AnaliseSemana {
  dias: CortesDia[];
  maisMovimentado: CortesDia;
  menosMovimentado: CortesDia;
  totalCortes: number;
}

export function analiseSemana(): AnaliseSemana {
  const dias = CORTES_SEMANA;
  const ordenado = [...dias].sort((a, b) => a.cortes - b.cortes);
  return {
    dias,
    menosMovimentado: ordenado[0],
    maisMovimentado: ordenado[ordenado.length - 1],
    totalCortes: dias.reduce((s, d) => s + d.cortes, 0),
  };
}

// Concentração de cortes por faixa de horário (ajuda a dimensionar a equipe).
export function cortesPorHora(): FaixaHora[] {
  return [
    { hora: "09h", cortes: 6 },
    { hora: "10h", cortes: 9 },
    { hora: "11h", cortes: 11 },
    { hora: "12h", cortes: 5 },
    { hora: "13h", cortes: 4 },
    { hora: "14h", cortes: 10 },
    { hora: "15h", cortes: 14 },
    { hora: "16h", cortes: 17 },
    { hora: "17h", cortes: 19 },
    { hora: "18h", cortes: 16 },
    { hora: "19h", cortes: 8 },
  ];
}

// ===== Calendário (ocupação do mês) =====

const CAPACIDADE_DIA = 16; // horários ofertados por dia

// Hash determinístico por dia -> ocupação estável (sem divergência de hidratação).
function ocupacaoDoDia(ano: number, mes: number, dia: number): number {
  const dow = new Date(ano, mes, dia).getDay(); // 0 = domingo
  if (dow === 0) return 0; // fechado aos domingos
  const base = dow === 6 ? 14 : dow === 5 ? 12 : dow === 1 ? 4 : 8;
  const ruido = (dia * 7 + mes * 13) % 5; // -2..+2 de variação
  return Math.max(0, Math.min(CAPACIDADE_DIA, base + (ruido - 2)));
}

export function ocupacaoMes(ano: number, mes: number): DiaOcupacao[] {
  const totalDias = new Date(ano, mes + 1, 0).getDate();
  return Array.from({ length: totalDias }, (_, i) => {
    const dia = i + 1;
    return { dia, cortes: ocupacaoDoDia(ano, mes, dia), capacidade: CAPACIDADE_DIA };
  });
}

// Lista de horários de um dia com o que está ocupado, derivada da ocupação.
export function slotsDoDia(ano: number, mes: number, dia: number): [string, boolean][] {
  const ocupados = ocupacaoDoDia(ano, mes, dia);
  return horarios.map(([hora], idx) => [hora, idx < ocupados]);
}
