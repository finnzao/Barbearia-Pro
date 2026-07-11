import { validateEnv } from './env.validation';

const completo = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db?schema=public',
  JWT_SECRET: 'segredo',
  MERCADOPAGO_WEBHOOK_SECRET: 'webhook',
  CIFRA_SEGREDO: 'a'.repeat(64),
};

function semChave(chave: keyof typeof completo): Record<string, string> {
  const copia: Record<string, string> = { ...completo };
  delete copia[chave];
  return copia;
}

describe('validateEnv', () => {
  it('aceita ambiente completo', () => {
    const env = validateEnv(completo);
    expect(env.DATABASE_URL).toBe(completo.DATABASE_URL);
    expect(env.MERCADOPAGO_WEBHOOK_SECRET).toBe(
      completo.MERCADOPAGO_WEBHOOK_SECRET,
    );
  });

  it('falha quando DATABASE_URL está ausente', () => {
    expect(() => validateEnv(semChave('DATABASE_URL'))).toThrow(/DATABASE_URL/);
  });

  it('falha quando JWT_SECRET está ausente', () => {
    expect(() => validateEnv(semChave('JWT_SECRET'))).toThrow(/JWT_SECRET/);
  });

  it('falha quando uma variável obrigatória está vazia', () => {
    expect(() =>
      validateEnv({ ...completo, MERCADOPAGO_WEBHOOK_SECRET: '' }),
    ).toThrow(/MERCADOPAGO_WEBHOOK_SECRET/);
  });

  it('aceita ambiente sem credenciais OAuth do MP (cai no gateway mock)', () => {
    const env = validateEnv(completo);
    expect(env.MERCADOPAGO_CLIENT_SECRET).toBeUndefined();
  });

  it('rejeita CIFRA_SEGREDO que não seja 64 hex', () => {
    expect(() => validateEnv({ ...completo, CIFRA_SEGREDO: 'curta' })).toThrow(
      /CIFRA_SEGREDO/,
    );
  });
});
