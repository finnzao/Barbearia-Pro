import { normalizarTelefone, TELEFONE_BR } from './telefone';

describe('telefone', () => {
  it('normaliza máscara, espaços e +55 para dígitos locais', () => {
    expect(normalizarTelefone('(11) 98765-0000')).toBe('11987650000');
    expect(normalizarTelefone('7599802-8785')).toBe('75998028785'); // o bug do ticket
    expect(normalizarTelefone('+55 11 98765 0000')).toBe('11987650000');
    expect(normalizarTelefone('5511987650000')).toBe('11987650000');
    expect(normalizarTelefone(null)).toBe('');
  });

  it('aceita celular (11) e fixo (10) BR, recusa lixo', () => {
    const ok = (v: string) => TELEFONE_BR.test(normalizarTelefone(v));
    expect(ok('(11) 98765-0000')).toBe(true);
    expect(ok('7599802-8785')).toBe(true);
    expect(ok('(11) 3232-0000')).toBe(true); // fixo, 10 dígitos
    expect(ok('123')).toBe(false);
    expect(ok('(01) 98765-0000')).toBe(false); // DDD não começa com 0
    expect(ok('11987650000000')).toBe(false); // dígitos demais
  });
});
