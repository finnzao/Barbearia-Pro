const UNIDADES: Record<string, number> = {
  ms: 1,
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

export function parseDuration(valor: string): number {
  const match = /^(\d+)(ms|s|m|h|d)$/.exec(valor.trim());
  if (!match) {
    throw new Error(`Duração inválida: ${valor}`);
  }
  return Number(match[1]) * UNIDADES[match[2]];
}
