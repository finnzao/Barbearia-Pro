import type {
  Agendamento,
  ClienteRecorrente,
  ComissaoProfissional,
  CortesDia,
  DiaOcupacao,
  FaixaHora,
  FaturamentoMes,
  FormaPagamentoResumo,
  MetodoPagamento,
  Pagamento,
  Periodo,
  Profissional,
  ReceitaProfissional,
  RelatorioFinanceiro,
  ResumoHoje,
  Servico,
  ServicoRealizado,
  StatusAgendamento,
} from "./types";



export const profissionais: Profissional[] = [
  { id: "p1", nome: "Téo Andrade", apelido: "Téo", comissaoPercent: 0.5, chavePix: "teo.andrade@pix.com", pixTipoChave: "email" },
  { id: "p2", nome: "Rafael Lima", apelido: "Rafa", comissaoPercent: 0.45, chavePix: "rafael.lima@pix.com", pixTipoChave: "email" },
  { id: "p3", nome: "Bruno Souza", apelido: "Bruno", comissaoPercent: 0.4, chavePix: "11999990003", pixTipoChave: "telefone" },
];

export const servicos: Servico[] = [
  { id: "s1", nome: "Corte + barba", duracaoMin: 45, preco: 8000 },
  { id: "s2", nome: "Corte máquina", duracaoMin: 30, preco: 4500 },
  { id: "s3", nome: "Corte tesoura", duracaoMin: 40, preco: 7000 },
  { id: "s4", nome: "Barba terapia", duracaoMin: 30, preco: 5000 },
  { id: "s5", nome: "Platinado", duracaoMin: 120, preco: 22000 },
];

export const agendamentos: Agendamento[] = [
  { id: "a1", hora: "09:00", cliente: "João Pedro", servico: "Corte + barba", profissionalId: "p1", profissional: "Téo", preco: 8000, status: "concluido", formaPagamento: "pix_dinamico" },
  { id: "a2", hora: "09:45", cliente: "Marcos V.", servico: "Corte máquina", profissionalId: "p2", profissional: "Rafa", preco: 4500, status: "concluido", formaPagamento: "cartao_debito" },
  { id: "a3", hora: "10:30", cliente: "Bruno Dias", servico: "Barba terapia", profissionalId: "p3", profissional: "Bruno", preco: 5000, status: "concluido", formaPagamento: "dinheiro" },
  { id: "a4", hora: "11:15", cliente: "Felipe R.", servico: "Corte tesoura", profissionalId: "p1", profissional: "Téo", preco: 7000, status: "concluido", formaPagamento: "pix_estatico" },
  { id: "a5", hora: "14:00", cliente: "Anderson L.", servico: "Platinado", profissionalId: "p2", profissional: "Rafa", preco: 22000, status: "confirmado" },
  { id: "a6", hora: "15:30", cliente: "Thiago M.", servico: "Corte + barba", profissionalId: "p3", profissional: "Bruno", preco: 8000, status: "confirmado" },
  { id: "a7", hora: "16:15", cliente: "Gabriel S.", servico: "Corte máquina", profissionalId: "p1", profissional: "Téo", preco: 4500, status: "pendente" },
  { id: "a8", hora: "17:00", cliente: "Lucas F.", servico: "Barba terapia", profissionalId: "p2", profissional: "Rafa", preco: 5000, status: "cancelado" },
];

export const pagamentos: Pagamento[] = [
  { id: "pg1", profissionalId: "p1", profissional: "Téo", agendamentoId: "a1", servico: "Corte + barba", valor: 8000, comissaoPercent: 0.5, metodo: "pix_dinamico", status: "pago", pagoEm: "2026-06-13T09:05:00Z" },
  { id: "pg2", profissionalId: "p2", profissional: "Rafa", agendamentoId: "a2", servico: "Corte máquina", valor: 4500, comissaoPercent: 0.45, metodo: "cartao_debito", status: "pago", pagoEm: "2026-06-13T09:50:00Z" },
  { id: "pg3", profissionalId: "p1", profissional: "Téo", agendamentoId: "a4", servico: "Corte tesoura", valor: 7000, comissaoPercent: 0.5, metodo: "pix_estatico", status: "pago", pagoEm: "2026-06-13T11:20:00Z" },
  { id: "pg-cred1", profissionalId: "p1", profissional: "Téo", agendamentoId: null, servico: "Corte + barba", valor: 8000, comissaoPercent: 0.5, metodo: "cartao_credito", status: "pago", pagoEm: "2026-06-13T11:55:00Z" },
  { id: "pg-av1", profissionalId: "p2", profissional: "Rafa", agendamentoId: null, servico: "Pézinho", valor: 2000, comissaoPercent: 0.45, metodo: "pix_estatico", status: "pago", pagoEm: "2026-06-13T12:10:00Z" },
  { id: "pg-din1", profissionalId: "p3", profissional: "Bruno", agendamentoId: null, servico: "Acabamento", valor: 4000, comissaoPercent: 0.4, metodo: "dinheiro", status: "pago", pagoEm: "2026-06-13T13:30:00Z" },
  { id: "pg-cred2", profissionalId: "p3", profissional: "Bruno", agendamentoId: null, servico: "Corte máquina", valor: 4500, comissaoPercent: 0.4, metodo: "cartao_credito", status: "pendente", pagoEm: null },
  { id: "pg-din2", profissionalId: "p3", profissional: "Bruno", agendamentoId: "a3", servico: "Barba terapia", valor: 5000, comissaoPercent: 0.4, metodo: "dinheiro", status: "pendente", pagoEm: null },
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
      liquidoBarbearia: faturado - comissao,
    };
  });
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
  { dia: "Seg", cortes: 9, faturamento: 56000 },
  { dia: "Ter", cortes: 14, faturamento: 91000 },
  { dia: "Qua", cortes: 16, faturamento: 108000 },
  { dia: "Qui", cortes: 19, faturamento: 129000 },
  { dia: "Sex", cortes: 26, faturamento: 184000 },
  { dia: "Sáb", cortes: 31, faturamento: 221000 },
  { dia: "Dom", cortes: 6, faturamento: 38000 },
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

// ---------------------------------------------------------------------------
// Relatórios — fonte única.
// Tudo que precisa reconciliar (faturamento, receita por profissional,
// serviços, formas de pagamento) vem de UMA base: os atendimentos concluídos
// de uma semana de referência, gerados pelo mesmo `agendamentosDoDia` da
// agenda. Assim a soma das formas = soma dos serviços = soma das receitas =
// faturamento. O período (dia/semana/mês) apenas escala essa base.
//
// Recorrência de clientes, evolução mensal e picos de movimento são recortes
// de grão diferente (janela semanal / 6 meses) e por isso NÃO seguem o seletor
// de período — são painéis de contexto.
// ---------------------------------------------------------------------------

interface BaseSemana {
  faturamento: number;
  comissoes: number;
  liquido: number;
  atendimentos: number;
  ticketMedio: number;
  receitaProf: ReceitaProfissional[];
  servicos: ServicoRealizado[];
  formas: FormaPagamentoResumo[];
  clientes: ClienteRecorrente[];
}

// Semana de referência: seg–sáb de 9 a 14 de junho de 2026 (já no passado, logo
// todos os atendimentos saem como concluídos com forma de pagamento definida).
const SEMANA_REF = { ano: 2026, mes: 5, dias: [9, 10, 11, 12, 13, 14] };

// Escala relativa à semana: ~6 dias úteis por semana, ~26 por mês.
const ESCALA: Record<Periodo, number> = { dia: 1 / 6, semana: 1, mes: 26 / 6 };

let _baseSemana: BaseSemana | null = null;

function calcularBaseSemana(): BaseSemana {
  const comissaoDe = new Map(profissionais.map((p) => [p.id, p.comissaoPercent]));
  const atendimentos = SEMANA_REF.dias.flatMap((d) =>
    agendamentosDoDia(SEMANA_REF.ano, SEMANA_REF.mes, d),
  );

  let faturamento = 0;
  let comissoes = 0;
  const porProf = new Map<string, ReceitaProfissional>();
  const porServico = new Map<string, ServicoRealizado>();
  const porForma = new Map<MetodoPagamento, FormaPagamentoResumo>();
  const porCliente = new Map<string, ClienteRecorrente>();

  for (const a of atendimentos) {
    const pct = comissaoDe.get(a.profissionalId) ?? 0;
    const comissao = Math.round(a.preco * pct);
    faturamento += a.preco;
    comissoes += comissao;

    const rp = porProf.get(a.profissionalId) ?? {
      profissionalId: a.profissionalId,
      profissional: a.profissional,
      atendimentos: 0,
      receita: 0,
      comissao: 0,
      liquido: 0,
    };
    rp.atendimentos += 1;
    rp.receita += a.preco;
    rp.comissao += comissao;
    rp.liquido = rp.receita - rp.comissao;
    porProf.set(a.profissionalId, rp);

    const sv = porServico.get(a.servico) ?? { servico: a.servico, quantidade: 0, receita: 0 };
    sv.quantidade += 1;
    sv.receita += a.preco;
    porServico.set(a.servico, sv);

    if (a.formaPagamento) {
      const fm = porForma.get(a.formaPagamento) ?? { metodo: a.formaPagamento, quantidade: 0, total: 0 };
      fm.quantidade += 1;
      fm.total += a.preco;
      porForma.set(a.formaPagamento, fm);
    }

    const cl = porCliente.get(a.cliente) ?? { cliente: a.cliente, visitas: 0, total: 0 };
    cl.visitas += 1;
    cl.total += a.preco;
    porCliente.set(a.cliente, cl);
  }

  const count = atendimentos.length;
  return {
    faturamento,
    comissoes,
    liquido: faturamento - comissoes,
    atendimentos: count,
    ticketMedio: count ? Math.round(faturamento / count) : 0,
    receitaProf: [...porProf.values()].sort((a, b) => b.receita - a.receita),
    servicos: [...porServico.values()].sort((a, b) => b.quantidade - a.quantidade),
    formas: [...porForma.values()].sort((a, b) => b.total - a.total),
    clientes: [...porCliente.values()]
      .filter((c) => c.visitas >= 2)
      .sort((a, b) => b.visitas - a.visitas)
      .slice(0, 6),
  };
}

// Calculada uma única vez (lazy) e reutilizada — evita refazer a varredura a cada chamada.
function baseSemana(): BaseSemana {
  if (!_baseSemana) _baseSemana = calcularBaseSemana();
  return _baseSemana;
}

export function relatorioFinanceiro(periodo: Periodo): RelatorioFinanceiro {
  const b = baseSemana();
  const f = ESCALA[periodo];
  const faturamento = Math.round(b.faturamento * f);
  const comissoes = Math.round(b.comissoes * f);
  const atendimentos = Math.round(b.atendimentos * f);
  return {
    faturamento,
    comissoes,
    liquido: faturamento - comissoes,
    atendimentos,
    ticketMedio: atendimentos ? Math.round(faturamento / atendimentos) : 0,
  };
}

export function receitaPorProfissional(periodo: Periodo): ReceitaProfissional[] {
  const f = ESCALA[periodo];
  return baseSemana().receitaProf.map((r) => {
    const receita = Math.round(r.receita * f);
    const comissao = Math.round(r.comissao * f);
    return {
      ...r,
      atendimentos: Math.round(r.atendimentos * f),
      receita,
      comissao,
      liquido: receita - comissao,
    };
  });
}

export function servicosRealizados(periodo: Periodo): ServicoRealizado[] {
  const f = ESCALA[periodo];
  return baseSemana().servicos.map((s) => ({
    servico: s.servico,
    quantidade: Math.max(1, Math.round(s.quantidade * f)),
    receita: Math.round(s.receita * f),
  }));
}

export function formasPagamento(periodo: Periodo): FormaPagamentoResumo[] {
  const f = ESCALA[periodo];
  return baseSemana().formas.map((fm) => ({
    metodo: fm.metodo,
    quantidade: Math.max(1, Math.round(fm.quantidade * f)),
    total: Math.round(fm.total * f),
  }));
}

// Recorrência é um conceito de janela: sempre a semana de referência (sem escalar).
export function clientesRecorrentes(): ClienteRecorrente[] {
  return baseSemana().clientes;
}

// Evolução dos últimos 6 meses, terminando exatamente no faturamento mensal
// projetado — para o gráfico fechar com o indicador de cima. Valor em centavos.
export function faturamentoMensal(): FaturamentoMes[] {
  const jun = Math.round(baseSemana().faturamento * ESCALA.mes);
  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"];
  const fatores = [0.74, 0.79, 0.85, 0.82, 0.93, 1];
  return meses.map((mes, i) => ({ mes, faturamento: Math.round(jun * fatores[i]) }));
}

// ---------------------------------------------------------------------------
// Agenda em calendário. A grade de horários é fixa (a barbearia trabalha em
// janelas de 30 min, com parada para o almoço). Para cada dia geramos os
// agendamentos de forma determinística a partir da ocupação do dia, então o
// calendário, a lista do dia e a grade de horários sempre contam a mesma
// história — sem números que mudam a cada render.
// ---------------------------------------------------------------------------

export const GRADE_DIA: string[] = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00",
];

const CLIENTES_AGENDA = [
  "João Pedro", "Marcos V.", "Bruno Dias", "Felipe R.", "Anderson L.", "Thiago M.",
  "Gabriel S.", "Lucas F.", "Rodrigo A.", "Vinícius P.", "Caio M.", "Diego S.",
  "Henrique L.", "Otávio R.",
];

const FORMAS_AGENDA: MetodoPagamento[] = [
  "pix_dinamico", "dinheiro", "cartao_debito", "cartao_credito", "pix_estatico",
];

// Retorna os agendamentos de um dia específico (vazio aos domingos, dia fechado).
export function agendamentosDoDia(ano: number, mes: number, dia: number): Agendamento[] {
  const dow = new Date(ano, mes, dia).getDay();
  if (dow === 0) return [];

  const qtd = Math.min(ocupacaoDoDia(ano, mes, dia), GRADE_DIA.length);
  if (qtd === 0) return [];

  const seed = dia * 31 + (mes + 1) * 17 + ano;
  // Escolhe `qtd` horários distintos da grade, espalhados pelo dia.
  const indices = GRADE_DIA.map((_, i) => i)
    .sort((a, b) => ((a * 73 + seed) % 101) - ((b * 73 + seed) % 101))
    .slice(0, qtd)
    .sort((a, b) => a - b);

  const hoje = new Date();
  const refHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const refDia = new Date(ano, mes, dia);
  const passado = refDia.getTime() < refHoje.getTime();
  const ehHoje = refDia.getTime() === refHoje.getTime();

  return indices.map((slot, i) => {
    const servico = servicos[(seed + slot) % servicos.length];
    const prof = profissionais[(seed + i) % profissionais.length];
    const cliente = CLIENTES_AGENDA[(seed + slot * 3) % CLIENTES_AGENDA.length];

    let status: StatusAgendamento;
    if (passado) status = "concluido";
    else if (ehHoje && i < Math.floor(qtd / 2)) status = "concluido"; // parte do dia já passou
    else status = "confirmado";

    const formaPagamento =
      status === "concluido" ? FORMAS_AGENDA[(seed + slot) % FORMAS_AGENDA.length] : undefined;

    return {
      id: `ag-${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}-${slot}`,
      hora: GRADE_DIA[slot],
      cliente,
      servico: servico.nome,
      profissionalId: prof.id,
      profissional: prof.apelido,
      preco: servico.preco,
      status,
      formaPagamento,
    };
  });
}

// Quantos agendamentos um dia tem (usado pelo calendário sem montar a lista toda).
export function totalAgendamentosDoDia(ano: number, mes: number, dia: number): number {
  const dow = new Date(ano, mes, dia).getDay();
  if (dow === 0) return 0;
  return Math.min(ocupacaoDoDia(ano, mes, dia), GRADE_DIA.length);
}
