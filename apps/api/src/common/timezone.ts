function offsetMinutos(fuso: string, instante: Date): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: fuso,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const partes = dtf.formatToParts(instante);
  const m: Record<string, string> = {};
  for (const p of partes) {
    m[p.type] = p.value;
  }
  const comoUtc = Date.UTC(
    Number(m.year),
    Number(m.month) - 1,
    Number(m.day),
    Number(m.hour),
    Number(m.minute),
    Number(m.second),
  );
  return (comoUtc - instante.getTime()) / 60000;
}

export function horaLocalParaUtc(
  data: string,
  hora: string,
  fuso: string,
): Date {
  const [ano, mes, dia] = data.split('-').map(Number);
  const [h, min] = hora.split(':').map(Number);
  const palpite = Date.UTC(ano, mes - 1, dia, h, min);
  const offset = offsetMinutos(fuso, new Date(palpite));
  return new Date(palpite - offset * 60000);
}

export function horaDeTime(time: Date): string {
  return time.toISOString().slice(11, 16);
}

// "dd/MM HH:mm" no fuso da barbearia, para textos de notificação.
export function formatarLocal(instante: Date, fuso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: fuso,
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
    .format(instante)
    .replace(',', '');
}

// Hora local (0-23) no fuso informado — usada na janela de silêncio.
export function horaLocal(instante: Date, fuso: string): number {
  return Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: fuso,
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(instante),
  );
}
