import { validateEnv } from './env.validation';

const completo = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db?schema=public',
  JWT_SECRET: 'segredo',
  PSP_API_KEY: 'chave',
  PSP_WEBHOOK_SECRET: 'webhook',
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
    expect(env.PSP_API_KEY).toBe(completo.PSP_API_KEY);
  });

  it('falha quando DATABASE_URL está ausente', () => {
    expect(() => validateEnv(semChave('DATABASE_URL'))).toThrow(/DATABASE_URL/);
  });

  it('falha quando JWT_SECRET está ausente', () => {
    expect(() => validateEnv(semChave('JWT_SECRET'))).toThrow(/JWT_SECRET/);
  });

  it('falha quando uma variável obrigatória está vazia', () => {
    expect(() => validateEnv({ ...completo, PSP_API_KEY: '' })).toThrow(
      /PSP_API_KEY/,
    );
  });
});
