import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

// AES-256-GCM. Chave: 64 chars hex (32 bytes) vinda do env CIFRA_SEGREDO.
// Formato do cifrado: iv.tag.dados (base64url), autenticado — alterar qualquer parte falha.

export function cifrar(texto: string, chaveHex: string): string {
  const chave = Buffer.from(chaveHex, 'hex');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', chave, iv);
  const dados = Buffer.concat([cipher.update(texto, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${dados.toString('base64url')}`;
}

export function decifrar(cifrado: string, chaveHex: string): string {
  const [iv, tag, dados] = cifrado.split('.');
  const decipher = createDecipheriv(
    'aes-256-gcm',
    Buffer.from(chaveHex, 'hex'),
    Buffer.from(iv, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(dados, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}
