// Fonte única de telefone no front (DRY): normalização, validação e máscara BR.
// Sem lib externa. BR = DDD (2) + 8 (fixo) ou 9 (celular) dígitos; +55 opcional.

// País padrão do fluxo. Só BR hoje (Pix/MP/fuso são todos BR) — vira lista se
// um dia atender fora. ponytail: seletor de país quando houver 2º país real.
export const PAIS_PADRAO = { flag: "🇧🇷", ddi: "+55" };

const NAO_DIGITO = /\D+/g;
const TELEFONE_BR = /^[1-9]{2}[0-9]{8,9}$/; // DDD 11–99 + 8 ou 9 dígitos

/** Só os dígitos: "(11) 98765-0000" → "11987650000". */
export function soDigitos(v: string): string {
  return v.replace(NAO_DIGITO, "");
}

/** Dígitos locais, sem máscara e sem o 55 do DDI: "+55 (11) 9..." → "119...". */
export function normalizarTelefone(v: string): string {
  const d = soDigitos(v);
  return d.length > 11 && d.startsWith("55") ? d.slice(2) : d;
}

/** Aceita celular (11) e fixo (10) BR, com ou sem máscara/DDI. */
export function telefoneValido(v: string): boolean {
  return TELEFONE_BR.test(normalizarTelefone(v));
}

/** Máscara de exibição de um número completo: "11987650000" → "(11) 98765-0000". */
export function formatarTelefone(v: string): string {
  const d = normalizarTelefone(v);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return v; // formato inesperado: devolve cru em vez de mentir uma máscara
}

/**
 * Máscara progressiva para usar no onChange enquanto o usuário digita.
 * Converge para os dois formatos BR: "(75) 9802-8785" (fixo, 10) e
 * "(75) 99802-8785" (celular, 11). O traço fica sempre antes dos 4 últimos.
 */
export function mascaraTelefone(v: string): string {
  const d = normalizarTelefone(v).slice(0, 11); // BR tem no máximo 11 dígitos
  if (d.length <= 2) return d;
  const ddd = d.slice(0, 2);
  const resto = d.slice(2);
  if (resto.length <= 4) return `(${ddd}) ${resto}`;
  return `(${ddd}) ${resto.slice(0, -4)}-${resto.slice(-4)}`;
}
