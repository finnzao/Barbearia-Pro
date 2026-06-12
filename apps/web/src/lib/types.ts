export type StatusAgendamento =
  | "confirmado"
  | "concluido"
  | "cancelado"
  | "pendente";

export type Periodo = "dia" | "semana" | "mes";

export interface Profissional {
  id: string;
  nome: string;
  apelido: string;
  comissaoPercent: number; // 0..1
  iniciais: string;
}

export interface Servico {
  id: string;
  nome: string;
  duracaoMin: number;
  preco: number; // em reais
}

export interface Agendamento {
  id: string;
  hora: string; // "09:30"
  cliente: string;
  servico: string;
  profissionalId: string;
  profissional: string;
  preco: number;
  status: StatusAgendamento;
}

export interface ComissaoProfissional {
  profissionalId: string;
  profissional: string;
  atendimentos: number;
  faturado: number;
  comissaoPercent: number;
  comissao: number;
}

export interface ResumoHoje {
  data: string;
  faturamento: number;
  atendimentos: number;
  ticketMedio: number;
  comissoesApagar: number;
  proximos: Agendamento[];
  comissoes: ComissaoProfissional[];
}
