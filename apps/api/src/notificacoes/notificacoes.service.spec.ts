import { dentroDoHorario, montarTexto } from './notificacoes.service';

const barbearia = { nome: 'Barbearia X', fuso: 'America/Sao_Paulo' };
// 2026-06-29 14:00 UTC = 11:00 em São Paulo (UTC-3)
const inicio = new Date('2026-06-29T14:00:00.000Z');

describe('montarTexto', () => {
  it('formata no fuso da barbearia e inclui o serviço', () => {
    const texto = montarTexto('confirmacao', {
      inicio,
      servico: { nome: 'Corte' },
      barbearia,
    });
    expect(texto).toContain('11:00');
    expect(texto).toContain('Corte');
    expect(texto).toContain('Barbearia X');
  });

  it('cada tipo gera uma mensagem distinta', () => {
    const base = { inicio, servico: { nome: 'Corte' }, barbearia };
    const tipos = [
      'confirmacao',
      'lembrete',
      'cancelamento',
      'remarcacao',
    ] as const;
    const textos = tipos.map((t) => montarTexto(t, base));
    expect(new Set(textos).size).toBe(4);
  });
});

describe('dentroDoHorario (janela de silêncio)', () => {
  const fuso = 'America/Sao_Paulo';
  it('11:00 local está dentro de [8,21)', () => {
    expect(dentroDoHorario(inicio, fuso, 8, 21)).toBe(true);
  });
  it('05:00 local está fora (madrugada)', () => {
    // 08:00 UTC = 05:00 em São Paulo
    const madrugada = new Date('2026-06-29T08:00:00.000Z');
    expect(dentroDoHorario(madrugada, fuso, 8, 21)).toBe(false);
  });
  it('o limite superior é exclusivo (21h fora)', () => {
    // 00:00 UTC = 21:00 do dia anterior em São Paulo
    const fim = new Date('2026-06-30T00:00:00.000Z');
    expect(dentroDoHorario(fim, fuso, 8, 21)).toBe(false);
  });
});
