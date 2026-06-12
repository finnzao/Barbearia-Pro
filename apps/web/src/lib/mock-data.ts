import type {
  Agendamento,
  ComissaoProfissional,
  Periodo,
  Profissional,
  ResumoHoje,
  Servico,
} from "./types";

// ---------------------------------------------------------------------------
// DADOS MOCKADOS
// Tudo aqui é provisório. Quando a API do Nest existir, o arquivo `api.ts`
// troca estas funções por chamadas `fetch` — os componentes não mudam.
// ---------------------------------------------------------------------------

export const profissionais: Profissional[] = [
  { id: "p1", nome: "Carlos Andrade", apelido: "Carlão", comissaoPercent: 0.5, iniciais: "CA" },
  { id: "p2", nome: "Rafael Lima", apelido: "Rafa", comissaoPercent: 0.45, iniciais: "RL" },
  { id: "p3", nome: "Diego Souza", apelido: "Diego", comissaoPercent: 0.4, iniciais: "DS" },
];

export const servicos: Servico[] = [
  { id: "s1", nome: "Corte máquina", duracaoMin: 30, preco: 45 },
  { id: "s2", nome: "Corte + tesoura", duracaoMin: 45, preco: 60 },
  { id: "s3", nome: "Barba", duracaoMin: 30, preco: 40 },
  { id: "s4", nome: "Corte + barba", duracaoMin: 60, preco: 90 },
  { id: "s5", nome: "Pezinho", duracaoMin: 15, preco: 20 },
  { id: "s6", nome: "Platinado", duracaoMin: 120, preco: 220 },
];

export const agendamentos: Agendamento[] = [
  { id: "a1", hora: "09:00", cliente: "JoãoPedro", servico: "Corte + barba", profissionalId: "p1", profissional: "Carlão", preco: 90, status: "concluido" },
  { id: "a2", hora: "09:30", cliente: "Marcos V.", servico: "Corte máquina", profissionalId: "p2", profissional: "Rafa", preco: 45, status: "concluido" },
  { id: "a3", hora: "10:00", cliente: "Bruno Dias", servico: "Barba", profissionalId: "p3", profissional: "Diego", preco: 40, status: "concluido" },
  { id: "a4", hora: "10:30", cliente: "Felipe R.", servico: "Corte + tesoura", profissionalId: "p1", profissional: "Carlão", preco: 60, status: "concluido" },
  { id: "a5", hora: "14:00", cliente: "Anderson L.", servico: "Platinado", profissionalId: "p2", profissional: "Rafa", preco: 220, status: "confirmado" },
  { id: "a6", hora: "15:00", cliente: "Thiago M.", servico: "Corte + barba", profissionalId: "p3", profissional: "Diego", preco: 90, status: "confirmado" },
  { id: "a7", hora: "16:00", cliente: "Gabriel S.", servico: "Corte máquina", profissionalId: "p1", profissional: "Carlão", preco: 45, status: "pendente" },
  { id: "a8", hora: "17:00", cliente: "Lucas F.", servico: "Pezinho", profissionalId: "p2", profissional: "Rafa", preco: 20, status: "cancelado" },
];

function calcComissoes(lista: Agendamento[]): ComissaoProfissional[] {
  return profissionais.map((p) => {
    const desteProf = lista.filter(
      (a) => a.profissionalId === p.id && a.status !== "cancelado",
    );
    const faturado = desteProf.reduce((soma, a) => soma + a.preco, 0);
    return {
      profissionalId: p.id,
      profissional: p.apelido,
      atendimentos: desteProf.length,
      faturado,
      comissaoPercent: p.comissaoPercent,
      comissao: Math.round(faturado * p.comissaoPercent),
    };
  });
}

// Multiplicadores só para simular dia/semana/mês com os mesmos dados base.
const fator: Record<Periodo, number> = { dia: 1, semana: 6, mes: 26 };

export function comissoesPorPeriodo(periodo: Periodo): ComissaoProfissional[] {
  const base = calcComissoes(agendamentos);
  const f = fator[periodo];
  return base.map((c) => ({
    ...c,
    atendimentos: c.atendimentos * f,
    faturado: c.faturado * f,
    comissao: c.comissao * f,
  }));
}

export function resumoHoje(): ResumoHoje {
  const validos = agendamentos.filter((a) => a.status !== "cancelado");
  const faturamento = validos.reduce((soma, a) => soma + a.preco, 0);
  const atendimentos = validos.length;
  const comissoes = calcComissoes(agendamentos);
  return {
    data: new Date().toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    }),
    faturamento,
    atendimentos,
    ticketMedio: atendimentos ? Math.round(faturamento / atendimentos) : 0,
    comissoesApagar: comissoes.reduce((soma, c) => soma + c.comissao, 0),
    proximos: agendamentos.filter((a) => a.status === "confirmado" || a.status === "pendente"),
    comissoes,
  };
}
