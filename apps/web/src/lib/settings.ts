
export interface ConfigAgendamento {
  clienteEscolheProfissional: boolean;

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

// Persistência provisória no navegador enquanto não há backend. Quando a API
// existir, estas duas funções viram GET/PUT em `config_barbearia`.
const CHAVE_CONFIG = "naregua:config-agendamento";

export function lerConfigSalva(): ConfigAgendamento {
  if (typeof window === "undefined") return CONFIG_PADRAO;
  try {
    const cru = window.localStorage.getItem(CHAVE_CONFIG);
    if (!cru) return CONFIG_PADRAO;
    return { ...CONFIG_PADRAO, ...JSON.parse(cru) };
  } catch {
    return CONFIG_PADRAO;
  }
}

export function salvarConfig(cfg: ConfigAgendamento): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CHAVE_CONFIG, JSON.stringify(cfg));
}
