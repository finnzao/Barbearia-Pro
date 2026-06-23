import { Prisma } from '@prisma/client';

export function calcularComissaoCentavos(
  valorCentavos: number,
  percent: Prisma.Decimal | number,
): number {
  const fracao = typeof percent === 'number' ? percent : percent.toNumber();
  return Math.round(valorCentavos * fracao);
}
