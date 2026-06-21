// Fonte única de verdade para dinheiro no frontend.
//
// Regra da aplicação: todo valor monetário é INTEIRO em CENTAVOS no estado,
// no banco e na API (ex.: 22000 = R$ 220,00). Isso evita erro de ponto
// flutuante (0.1 + 0.2 !== 0.3) que faz o caixa não fechar.
//
// A conversão para reais acontece SÓ aqui, na borda de exibição/entrada.
// Nenhum outro arquivo deve dividir ou multiplicar por 100 na mão — sempre
// passar por estas funções.

/** Centavos (int) → reais (number). Ex.: 22000 → 220 */
export const centavosParaReais = (centavos: number): number => centavos / 100;

/** Reais digitados pelo usuário → centavos (int). Ex.: 220 → 22000 */
export const reaisParaCentavos = (reais: number): number => Math.round(reais * 100);

/** Formata centavos como moeda BRL. Ex.: 22000 → "R$ 220,00" */
export const formatarBRL = (centavos: number): string =>
  centavosParaReais(centavos).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

/** Partes da moeda, para componentes que renderizam símbolo/centavos separados. */
export interface PartesMoeda {
  negativo: boolean;
  /** Parte inteira já com separador de milhar. Ex.: "1.234" */
  inteiro: string;
  /** Centavos com dois dígitos. Ex.: "00" */
  centavos: string;
}

export function partesMoeda(centavos: number): PartesMoeda {
  const reais = centavosParaReais(centavos);
  const negativo = reais < 0;
  const [inteiro, dec] = Math.abs(reais).toFixed(2).split(".");
  return {
    negativo,
    inteiro: inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, "."),
    centavos: dec,
  };
}
