
export interface ConfigAgendamento {
  clienteEscolheProfissional: boolean;

  clienteEscolheServico: boolean;
}

export const CONFIG_PADRAO: ConfigAgendamento = {
  clienteEscolheProfissional: true,
  clienteEscolheServico: true,
};
