// Ciclo mensal de uma assinatura, ancorado no dia-do-mês de `assinadoEm`.
// Sem tabela de rollover: a janela do ciclo atual é sempre calculada a partir
// de "agora" — mesmo princípio de "derivar, não armazenar" da RN-17.

function ultimoDiaDoMes(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
}

// Constrói a data do ciclo em (ano, mes), no dia âncora — clampado ao fim do
// mês (dia 31 vira 28/30 em meses curtos, como já se faz em repasse_dia).
function dataDoCiclo(ano: number, mes: number, diaAncora: number): Date {
  const dia = Math.min(diaAncora, ultimoDiaDoMes(ano, mes));
  return new Date(Date.UTC(ano, mes, dia));
}

export interface JanelaCiclo {
  inicio: Date;
  fim: Date;
}

// Janela [inicio, fim) do ciclo mensal que contém `agora`.
export function cicloAtual(assinadoEm: Date, agora: Date): JanelaCiclo {
  const diaAncora = assinadoEm.getUTCDate();
  let ano = agora.getUTCFullYear();
  let mes = agora.getUTCMonth();

  let inicio = dataDoCiclo(ano, mes, diaAncora);
  if (inicio.getTime() > agora.getTime()) {
    mes -= 1;
    if (mes < 0) {
      mes = 11;
      ano -= 1;
    }
    inicio = dataDoCiclo(ano, mes, diaAncora);
  }

  let mesFim = mes + 1;
  let anoFim = ano;
  if (mesFim > 11) {
    mesFim = 0;
    anoFim += 1;
  }
  const fim = dataDoCiclo(anoFim, mesFim, diaAncora);

  return { inicio, fim };
}
