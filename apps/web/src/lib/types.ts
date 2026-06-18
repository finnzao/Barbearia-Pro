export type StatusAgendamento = "confirmado" | "concluido" | "cancelado" | "pendente";
export type Periodo = "dia" | "semana" | "mes";

export type MetodoPagamento = "pix_dinamico" | "pix_estatico" | "dinheiro" | "cartao";
export type StatusPagamento = "pendente" | "pago" | "expirado" | "estornado";

export type TipoChavePix = "cpf" | "cnpj" | "email" | "telefone" | "aleatoria";

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
