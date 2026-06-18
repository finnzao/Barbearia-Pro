import type {
  Agendamento,
  ComissaoProfissional,
  CortesDia,
  DiaOcupacao,
  FaixaHora,
  Pagamento,
  Periodo,
  Profissional,
  ResumoHoje,
  Servico,
} from "./types";

export const profissionais: Profissional[] = [
  { id: "p1", nome: "Téo Andrade", apelido: "Téo", comissaoPercent: 0.5, chavePix: "teo.andrade@pix.com", pixTipoChave: "email" },
  { id: "p2", nome: "Rafael Lima", apelido: "Rafa", comissaoPercent: 0.45, chavePix: "rafael.lima@pix.com", pixTipoChave: "email" },
  { id: "p3", nome: "Bruno Souza", apelido: "Bruno", comissaoPercent: 0.4, chavePix: "11999990003", pixTipoChave: "telefone" },
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

export const pagamentos: Pagamento[] = [
  { id: "pg1", profissionalId: "p1", profissional: "Téo", agendamentoId: "a1", servico: "Corte + barba", valor: 80, comissaoPercent: 0.5, metodo: "pix_dinamico", status: "pago", pagoEm: "2026-06-13T09:05:00Z" },
  { id: "pg2", profissionalId: "p2", profissional: "Rafa", agendamentoId: "a2", servico: "Corte máquina", valor: 45, comissaoPercent: 0.45, metodo: "cartao", status: "pago", pagoEm: "2026-06-13T09:50:00Z" },
  { id: "pg3", profissionalId: "p1", profissional: "Téo", agendamentoId: "a4", servico: "Corte tesoura", valor: 70, comissaoPercent: 0.5, metodo: "pix_estatico", status: "pago", pagoEm: "2026-06-13T11:20:00Z" },
  { id: "pg-av1", profissionalId: "p2", profissional: "Rafa", agendamentoId: null, servico: "Pézinho", valor: 20, comissaoPercent: 0.45, metodo: "pix_estatico", status: "pago", pagoEm: "2026-06-13T12:10:00Z" },
  { id: "pg-din1", profissionalId: "p3", profissional: "Bruno", agendamentoId: null, servico: "Acabamento", valor: 40, comissaoPercent: 0.4, metodo: "dinheiro", status: "pago", pagoEm: "2026-06-13T13:30:00Z" },
  { id: "pg-din2", profissionalId: "p3", profissional: "Bruno", agendamentoId: "a3", servico: "Barba terapia", valor: 50, comissaoPercent: 0.4, metodo: "dinheiro", status: "pendente", pagoEm: null },
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

export function comissoesDerivadas(lista: Pagamento[]): ComissaoProfissional[] {
  return profissionais.map((p) => {
    const pagos = lista.filter((pg) => pg.profissionalId === p.id && pg.status === "pago");
    const faturado = pagos.reduce((s, pg) => s + pg.valor, 0);
    const comissao = pagos.reduce((s, pg) => s + Math.round(pg.valor * pg.comissaoPercent), 0);
    return {
      profissionalId: p.id,
      profissional: p.apelido,
      atendimentos: pagos.length,
      faturado,
      comissaoPercent: p.comissaoPercent,
      comissao,
    };
  });
}

const fator: Record<Periodo, number> = { dia: 1, semana: 6, mes: 26 };

export function comissoesPorPeriodo(periodo: Periodo): ComissaoProfissional[] {
  const f = fator[periodo];
  return comissoesDerivadas(pagamentos).map((c) => ({
    ...c,
    atendimentos: c.atendimentos * f,
    faturado: c.faturado * f,
    comissao: c.comissao * f,
  }));
}

export function resumoHoje(): ResumoHoje {
  const pagos = pagamentos.filter((pg) => pg.status === "pago");
  const faturamento = pagos.reduce((s, pg) => s + pg.valor, 0);
  const comissoes = comissoesDerivadas(pagamentos);
  return {
    data: new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }),
    faturamento,
    atendimentos: pagos.length,
    ticketMedio: pagos.length ? Math.round(faturamento / pagos.length) : 0,
    comissoesApagar: comissoes.reduce((soma, c) => soma + c.comissao, 0),
    proximos: agendamentos.filter((a) => a.status === "confirmado" || a.status === "pendente"),
    comissoes,
  };
}

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

const CAPACIDADE_DIA = 16;

function ocupacaoDoDia(ano: number, mes: number, dia: number): number {
  const dow = new Date(ano, mes, dia).getDay();
  if (dow === 0) return 0;
  const base = dow === 6 ? 14 : dow === 5 ? 12 : dow === 1 ? 4 : 8;
  const ruido = (dia * 7 + mes * 13) % 5;
  return Math.max(0, Math.min(CAPACIDADE_DIA, base + (ruido - 2)));
}

export function ocupacaoMes(ano: number, mes: number): DiaOcupacao[] {
  const totalDias = new Date(ano, mes + 1, 0).getDate();
  return Array.from({ length: totalDias }, (_, i) => {
    const dia = i + 1;
    return { dia, cortes: ocupacaoDoDia(ano, mes, dia), capacidade: CAPACIDADE_DIA };
  });
}

export function slotsDoDia(ano: number, mes: number, dia: number): [string, boolean][] {
  const ocupados = ocupacaoDoDia(ano, mes, dia);
  return horarios.map(([hora], idx) => [hora, idx < ocupados]);
}
