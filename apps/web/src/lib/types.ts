// Enums do domínio vêm do contrato compartilhado (@naregua/types), reexportados
// para os consumidores atuais de "@/lib/types".
import type {
  MetodoPagamento,
  StatusAgendamento,
  StatusPagamento,
  TipoChavePix,
} from "@naregua/types";

export type {
  MetodoPagamento,
  StatusAgendamento,
  StatusPagamento,
  TipoChavePix,
};

export type Periodo = "dia" | "semana" | "mes";

export interface Profissional {
  id: string;
  nome: string;
  apelido: string;
  comissaoPercent: number;
  chavePix?: string;
  pixTipoChave?: TipoChavePix;
}

export interface Servico {
  id: string;
  nome: string;
  duracaoMin: number;
  preco: number;
}

export interface Agendamento {
  id: string;
  hora: string;
  cliente: string;
  servico: string;
  profissionalId: string;
  profissional: string;
  preco: number;
  status: StatusAgendamento;
  formaPagamento?: MetodoPagamento;
}

export interface Pagamento {
  id: string;
  profissionalId: string;
  profissional: string;
  agendamentoId: string | null;
  servico: string | null;
  valor: number;
  comissaoPercent: number;
  metodo: MetodoPagamento;
  status: StatusPagamento;
  pagoEm: string | null;
}

export interface ComissaoProfissional {
  profissionalId: string;
  profissional: string;
  atendimentos: number;
  faturado: number;
  comissaoPercent: number;
  comissao: number;
  // Parte que fica com a barbearia: faturado - comissão do profissional.
  liquidoBarbearia: number;
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

export interface CortesDia {
  dia: string;
  cortes: number;
  faturamento: number;
}

export interface FaixaHora {
  hora: string;
  cortes: number;
}

export interface DiaOcupacao {
  dia: number;
  cortes: number;
  capacidade: number;
}

// ---- Relatórios ----
export interface ReceitaProfissional {
  profissionalId: string;
  profissional: string;
  atendimentos: number;
  receita: number;
  comissao: number;
  // Receita menos a comissão do profissional.
  liquido: number;
}

export interface ServicoRealizado {
  servico: string;
  quantidade: number;
  receita: number;
}

export interface FormaPagamentoResumo {
  metodo: MetodoPagamento;
  quantidade: number;
  total: number;
}

export interface ClienteRecorrente {
  cliente: string;
  visitas: number;
  total: number;
}

export interface FaturamentoMes {
  mes: string;
  faturamento: number;
}

export interface RelatorioFinanceiro {
  faturamento: number;
  comissoes: number;
  liquido: number;
  atendimentos: number;
  ticketMedio: number;
}
