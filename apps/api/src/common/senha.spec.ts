import { SENHA_FORTE } from './senha';

describe('SENHA_FORTE', () => {
  it('aceita senha com letra, número e >= 8 caracteres', () => {
    expect(SENHA_FORTE.test('Senha@123')).toBe(true);
    expect(SENHA_FORTE.test('segredo123')).toBe(true);
  });

  it('rejeita sem número', () => {
    expect(SENHA_FORTE.test('abcdefgh')).toBe(false);
  });

  it('rejeita sem letra', () => {
    expect(SENHA_FORTE.test('12345678')).toBe(false);
  });

  it('rejeita com menos de 8 caracteres', () => {
    expect(SENHA_FORTE.test('Ab1')).toBe(false);
  });
});
