import { Prisma } from '@prisma/client';
import { calcularComissaoCentavos } from './comissao.util';

describe('calcularComissaoCentavos', () => {
  it('calcula comissão a partir de número', () => {
    expect(calcularComissaoCentavos(4000, 0.5)).toBe(2000);
    expect(calcularComissaoCentavos(4000, 0.4)).toBe(1600);
  });

  it('arredonda para o centavo mais próximo', () => {
    expect(calcularComissaoCentavos(3333, 0.3333)).toBe(1111);
  });

  it('aceita Prisma.Decimal', () => {
    expect(calcularComissaoCentavos(6500, new Prisma.Decimal('0.5'))).toBe(
      3250,
    );
  });

  it('retorna zero quando o percentual é zero', () => {
    expect(calcularComissaoCentavos(9999, 0)).toBe(0);
  });
});
