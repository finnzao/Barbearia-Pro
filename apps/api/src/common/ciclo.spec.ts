import { cicloAtual } from './ciclo';

describe('cicloAtual', () => {
  it('agora no mesmo dia do âncora: ciclo começa hoje', () => {
    const assinadoEm = new Date('2026-01-10T12:00:00.000Z');
    const agora = new Date('2026-06-10T08:00:00.000Z');
    const { inicio, fim } = cicloAtual(assinadoEm, agora);
    expect(inicio.toISOString()).toBe('2026-06-10T00:00:00.000Z');
    expect(fim.toISOString()).toBe('2026-07-10T00:00:00.000Z');
  });

  it('agora antes do dia-âncora no mês: ciclo é do mês anterior', () => {
    const assinadoEm = new Date('2026-01-15T12:00:00.000Z');
    const agora = new Date('2026-06-10T08:00:00.000Z');
    const { inicio, fim } = cicloAtual(assinadoEm, agora);
    expect(inicio.toISOString()).toBe('2026-05-15T00:00:00.000Z');
    expect(fim.toISOString()).toBe('2026-06-15T00:00:00.000Z');
  });

  it('dia-âncora 31 clampado em mês curto (fevereiro)', () => {
    const assinadoEm = new Date('2026-01-31T12:00:00.000Z');
    const agora = new Date('2026-02-15T08:00:00.000Z');
    const { inicio, fim } = cicloAtual(assinadoEm, agora);
    expect(inicio.toISOString()).toBe('2026-01-31T00:00:00.000Z');
    expect(fim.toISOString()).toBe('2026-02-28T00:00:00.000Z');
  });

  it('vira o ciclo de dezembro para janeiro corretamente', () => {
    const assinadoEm = new Date('2026-01-20T12:00:00.000Z');
    const agora = new Date('2026-12-25T08:00:00.000Z');
    const { inicio, fim } = cicloAtual(assinadoEm, agora);
    expect(inicio.toISOString()).toBe('2026-12-20T00:00:00.000Z');
    expect(fim.toISOString()).toBe('2027-01-20T00:00:00.000Z');
  });
});
