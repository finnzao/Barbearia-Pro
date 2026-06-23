import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { LoginDto } from './login.dto';

function validar(payload: unknown) {
  return validateSync(plainToInstance(LoginDto, payload));
}

describe('LoginDto', () => {
  it('aceita payload válido', () => {
    expect(validar({ email: 'a@b.com', senha: '123' })).toHaveLength(0);
  });

  it('rejeita e-mail inválido', () => {
    const erros = validar({ email: 'naoemail', senha: '1' });
    expect(erros.some((e) => e.property === 'email')).toBe(true);
  });

  it('rejeita campos ausentes', () => {
    const props = validar({}).map((e) => e.property);
    expect(props).toEqual(expect.arrayContaining(['email', 'senha']));
  });

  it('rejeita tipo errado', () => {
    const erros = validar({ email: 'a@b.com', senha: 123 });
    expect(erros.some((e) => e.property === 'senha')).toBe(true);
  });
});
