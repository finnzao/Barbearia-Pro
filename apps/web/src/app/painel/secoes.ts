export interface ItemNav {
  href: string;
  label: string;
  icon: string;
  destaque?: boolean;
}

export interface Servico {
  key: string;
  href: string;
  label: string;
  icon: string;
  resumo: string;
  acao: string;
  destaque?: boolean;
}

export interface Atalho {
  href: string;
  label: string;
  icon: string;
}

export const NAV: ItemNav[] = [
  { href: "/painel", label: "Início", icon: "inicio" },
  { href: "/painel/agenda", label: "Agenda", icon: "agenda" },
  { href: "/painel/pagamentos", label: "Pagamentos", icon: "pagamentos" },
  { href: "/painel/profissionais", label: "Equipe", icon: "equipe" },
  { href: "/painel/cobranca", label: "Gerar Pix", icon: "pix", destaque: true },
];

export const SERVICOS: Servico[] = [
  { key: "cobranca", href: "/painel/cobranca", label: "Gerar Pix", icon: "pix", resumo: "Cobrança na conta do salão; o split separa a parte de cada profissional.", acao: "Gerar cobrança", destaque: true },
  { key: "agenda", href: "/painel/agenda", label: "Agenda", icon: "agenda", resumo: "Horários do dia e novos atendimentos.", acao: "Abrir agenda" },
  { key: "pagamentos", href: "/painel/pagamentos", label: "Pagamentos", icon: "pagamentos", resumo: "Recebimentos, comissões e repasse da equipe.", acao: "Ver pagamentos" },
  { key: "profissionais", href: "/painel/profissionais", label: "Profissionais", icon: "equipe", resumo: "Equipe, comissão e chave de repasse.", acao: "Gerenciar equipe" },
  { key: "servicos", href: "/painel/servicos", label: "Serviços", icon: "servico", resumo: "Catálogo de serviços, preço e duração.", acao: "Gerenciar serviços" },
  { key: "clientes", href: "/painel/clientes", label: "Clientes", icon: "cliente", resumo: "Histórico de atendimentos e fidelidade.", acao: "Ver clientes" },
  { key: "planos", href: "/painel/planos", label: "Planos", icon: "pagamentos", resumo: "Planos de assinatura vendidos aos clientes.", acao: "Ver planos" },
  { key: "relatorios", href: "/painel/relatorios", label: "Relatórios", icon: "relatorios", resumo: "Faturamento, ocupação e desempenho da semana.", acao: "Ver relatórios" },
  { key: "configuracoes", href: "/painel/configuracoes", label: "Configurações", icon: "config", resumo: "Horários, serviços, preços e preferências.", acao: "Abrir configurações" },
];

export const ATALHOS: Atalho[] = [
  { href: "/painel/cobranca", label: "Gerar Pix", icon: "pix" },
  { href: "/painel/agenda", label: "Novo agendamento", icon: "novo" },
  { href: "/painel/pagamentos", label: "Registrar recebimento", icon: "check" },
];
