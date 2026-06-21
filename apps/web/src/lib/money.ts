// Fonte única de verdade para dinheiro no frontend.
//
// Regra da aplicação: todo valor monetário é INTEIRO em CENTAVOS no estado,
// no banco e na API (ex.: 22000 = R$ 220,00). Isso evita erro de ponto
// flutuante (0.1 + 0.2 !== 0.3) que faz o caixa não fechar.
//
// A conversão para reais acontece SÓ aqui, na borda de exibição/entrada.
// Nenhum outro arquivo deve dividir ou multiplicar por 100 na mão — sempre
// passar por estas funções.

/** Centavos (int) → reais (number). Ex.: toReais(22000) === 220 */
export const toReais = (cents: number): number => cents / 100;

/** Reais digitados pelo usuário → centavos (int). Ex.: toCents(220) === 22000 */
export const toCents = (reais: number): number => Math.round(reais * 100);

/** Formata centavos como moeda BRL. Ex.: formatBRL(22000) === "R$ 220,00" */
export const formatBRL = (cents: number): string =>
  toReais(cents).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

/** Partes da moeda — espelha o padrão do Intl.formatToParts. */
export interface MoneyParts {
  negative: boolean;
  /** Parte inteira já com separador de milhar. Ex.: "1.234" */
  integer: string;
  /** Centavos com dois dígitos. Ex.: "00" */
  fraction: string;
}

export function formatBRLParts(cents: number): MoneyParts {
  const reais = toReais(cents);
  const negative = reais < 0;
  const [integer, fraction] = Math.abs(reais).toFixed(2).split(".");
  return {
    negative,
    integer: integer.replace(/\B(?=(\d{3})+(?!\d))/g, "."),
    fraction,
  };
}
