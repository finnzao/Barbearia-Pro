// Chave Pix fixa de cada profissional — cada um recebe direto na própria conta.
// Mock até o backend; no banco isso vive em profissional.chave_pix.
export const CHAVES_PIX: Record<string, string> = {
  p1: "teo.andrade@pix.com",
  p2: "rafael.lima@pix.com",
  p3: "11999990003",
};

export interface CobrancaPix {
  txid: string;
  copiaCola: string;
  valorCentavos: number;
  expiraEm: string;
}

// Monta um "copia e cola" apenas ilustrativo — o payload EMV real é emitido
// pelo PSP no backend. Aqui serve só para a tela demonstrar o fluxo.
export function gerarCobrancaPix(valorCentavos: number, chave: string): CobrancaPix {
  const txid = crypto.randomUUID().replace(/-/g, "").slice(0, 25);
  const valor = (valorCentavos / 100).toFixed(2);
  const copiaCola = `00020126BR.GOV.BCB.PIX${chave}5204000053039865406${valor}5802BR6007NAREGUA62${txid}6304`;
  const expiraEm = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  return { txid, copiaCola, valorCentavos, expiraEm };
}

// Pix fixo (estático): QR da chave do profissional, sem valor — o cliente digita.
export function pixEstatico(chave: string): string {
  return `00020126BR.GOV.BCB.PIX${chave}52040000530398655802BR6007NAREGUA6304`;
}

// Grade determinística só para ilustrar o QR (o código real vem do PSP).
export function gradeQr(seed: string, n = 23): boolean[][] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const proximo = () => {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    return h / 0x7fffffff;
  };
  return Array.from({ length: n }, () => Array.from({ length: n }, () => proximo() > 0.5));
}
