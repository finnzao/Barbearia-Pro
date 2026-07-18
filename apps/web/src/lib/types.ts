// Enums do domínio vêm do contrato compartilhado (@naregua/types), reexportados
// para os consumidores atuais de "@/lib/types".
import type {
  MetodoCobranca,
  MetodoPagamento,
  StatusAgendamento,
  StatusAssinaturaCliente,
  StatusPagamento,
  TipoChavePix,
} from "@naregua/types";

export type {
  MetodoCobranca,
  MetodoPagamento,
  StatusAgendamento,
  StatusAssinaturaCliente,
  StatusPagamento,
  TipoChavePix,
};

export type Periodo = "dia" | "semana" | "mes" | "ano";

export interface Profissional {
  id: string;
  nome: string;
  apelido: string;
  comissaoPercent: number;
  chavePix?: string;
  pixTipoChave?: TipoChavePix;
  ativo: boolean;
}

export interface Servico {
  id: string;
  nome: string;
  duracaoMin: number;
  preco: number;
  // Inativo some do link público, mas continua no histórico.
  ativo?: boolean;
  // Quem executa. Vazio = todos — é como o agendamento público interpreta.
  profissionalIds?: string[];
}

export interface Cliente {
  id: string;
  nome: string;
  whatsapp: string;
}

export interface ItemPlano {
  servicoId: string;
  servicoNome: string;
  quantidadeMes: number;
}

export interface Plano {
  id: string;
  nome: string;
  preco: number;
  ativo: boolean;
  itens: ItemPlano[];
}

export interface UsoItemAssinatura extends ItemPlano {
  usadoNoCiclo: number;
  restante: number;
}

export interface UsoAssinatura {
  cicloInicio: string;
  cicloFim: string;
  itens: UsoItemAssinatura[];
}

export interface AssinaturaCliente {
  id: string;
  clienteId: string;
  planoId: string;
  metodoCobranca: MetodoCobranca;
  status: StatusAssinaturaCliente;
  assinadoEm: string;
  ultimoCicloPagoEm: string | null;
  plano: Plano;
}

export interface Agendamento {
  id: string;
  hora: string;
  cliente: string;
  clienteWhatsapp?: string | null;
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
