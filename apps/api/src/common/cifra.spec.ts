import { randomBytes } from 'node:crypto';
import { cifrar, decifrar } from './cifra';

describe('cifra (AES-256-GCM)', () => {
  const chave = randomBytes(32).toString('hex');

  it('roundtrip devolve o texto original e não guarda plaintext', () => {
    const segredo = 'APP_USR-token-super-secreto-123';
    const cifrado = cifrar(segredo, chave);
    expect(cifrado).not.toContain(segredo);
    expect(decifrar(cifrado, chave)).toBe(segredo);
  });

  it('cifrado adulterado ou chave errada falham', () => {
    const cifrado = cifrar('dado', chave);
    const [iv, tag, dados] = cifrado.split('.');
    const adulterado = `${iv}.${tag}.${dados.slice(0, -2)}Zk`;
    expect(() => decifrar(adulterado, chave)).toThrow();
    expect(() => decifrar(cifrado, randomBytes(32).toString('hex'))).toThrow();
  });
});
