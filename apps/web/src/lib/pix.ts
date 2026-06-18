
export const CHAVE_CENTRAL = "salao@barbeariaregua.com";
export const NOME_RECEBEDOR = "Barbearia Régua";

export const MARCADOR_PROF: Record<string, string> = {
  p1: "PROF-TEO",
  p2: "PROF-RAFA",
  p3: "PROF-BRUNO",
};

export interface CobrancaPix {
  txid: string;
  copiaCola: string;
  valorCentavos: number;
  expiraEm: string;
  marcadorProf: string;
}

export function gerarCobrancaPix(valorCentavos: number, marcadorProf: string): CobrancaPix {
  const txid = crypto.randomUUID().replace(/-/g, "").slice(0, 18);
  const valor = (valorCentavos / 100).toFixed(2);
  const ref = `${marcadorProf}-${txid}`;
  const copiaCola = `00020126BR.GOV.BCB.PIX${CHAVE_CENTRAL}5204000053039865406${valor}5802BR6007NAREGUA62${ref}6304`;
  const expiraEm = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  return { txid, copiaCola, valorCentavos, expiraEm, marcadorProf };
}

export function pixEstaticoBalcao(marcadorProf: string): string {
  return `00020126BR.GOV.BCB.PIX${CHAVE_CENTRAL}52040000530398655802BR6007NAREGUA62${marcadorProf}6304`;
}

export function gradeQr(seed: string, n = 23): boolean[][] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const proximo = () => {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    return h / 0x7fffffff;
  };
  return Array.from({ length: n }, () => Array.from({ length: n }, () => proximo() > 0.5));
}
