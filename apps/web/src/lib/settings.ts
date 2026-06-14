// Opções do fluxo de agendamento que o dono liga/desliga no painel.
// Hoje vivem aqui como padrão; quando o backend existir, viram colunas em
// `config_barbearia` lidas pela API e escopadas por barbearia_id.
export interface ConfigAgendamento {
  // Cliente escolhe qual profissional vai cortar (senão, "primeiro disponível").
  clienteEscolheProfissional: boolean;
  // Cliente escolhe o serviço antes de marcar o horário (senão, define no balcão).
  clienteEscolheServico: boolean;
}

export const CONFIG_PADRAO: ConfigAgendamento = {
  clienteEscolheProfissional: true,
  clienteEscolheServico: true,
};

// Permite pré-visualizar o fluxo do cliente em qualquer combinação via querystring,
// ex.: /agendar?profissional=0&servico=1 — sem isso, usa o padrão acima.
export function resolverConfig(searchParams?: Record<string, string | undefined>): ConfigAgendamento {
  if (!searchParams) return CONFIG_PADRAO;
  const flag = (v: string | undefined, fallback: boolean) =>
    v === undefined ? fallback : v === "1" || v === "true";
  return {
    clienteEscolheProfissional: flag(searchParams.profissional, CONFIG_PADRAO.clienteEscolheProfissional),
    clienteEscolheServico: flag(searchParams.servico, CONFIG_PADRAO.clienteEscolheServico),
  };
}
