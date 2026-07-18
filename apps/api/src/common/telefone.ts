import { Transform } from 'class-transformer';

// Fonte única de telefone no backend (DRY). Espelha o front (lib/telefone.ts) —
// runtimes diferentes, então não dá pra compartilhar o arquivo; a regra é a
// mesma. BR = DDD (2) + 8 (fixo) ou 9 (celular) dígitos; +55 opcional.
export const TELEFONE_BR = /^[1-9]{2}[0-9]{8,9}$/;
export const TELEFONE_MSG = 'Informe um telefone válido com DDD.';

/** Dígitos locais, sem máscara e sem o 55 do DDI. */
export function normalizarTelefone(v: unknown): string {
  const d = String(v ?? '').replace(/\D+/g, '');
  return d.length > 11 && d.startsWith('55') ? d.slice(2) : d;
}

/**
 * Normaliza o telefone ANTES da validação. O ValidationPipe roda com
 * `transform: true`, então o @Transform executa antes do @Matches — é isso que
 * faz "(11) 98765-0000" passar sem a máscara quebrar a regex (a causa do bug).
 */
export const NormalizarTelefone = () =>
  Transform(({ value }) => normalizarTelefone(value));
