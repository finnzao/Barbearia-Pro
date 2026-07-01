"use client";

import { useCallback, useSyncExternalStore } from "react";

// Leitura de localStorage segura para SSR/hidratação (React 19), sem cair na
// regra set-state-in-effect: no servidor devolve o padrão; no cliente lê o valor
// real após hidratar, via useSyncExternalStore.

const EVENTO_LOCAL = "naregua:localstorage";

// Cache por chave para devolver a MESMA referência enquanto o JSON cru não muda
// (useSyncExternalStore exige snapshot estável, senão entra em loop de render).
const cache = new Map<string, { cru: string | null; valor: unknown }>();

function ler<T>(chave: string, padrao: T, leitor?: () => T): T {
  let cru: string | null = null;
  try {
    cru = window.localStorage.getItem(chave);
  } catch {
    /* ignore */
  }
  const atual = cache.get(chave);
  if (atual && atual.cru === cru) return atual.valor as T;
  let valor: T;
  try {
    // leitor permite parse customizado (ex.: migração de formato legado).
    valor = leitor ? leitor() : cru ? (JSON.parse(cru) as T) : padrao;
  } catch {
    valor = padrao;
  }
  cache.set(chave, { cru, valor });
  return valor;
}

function escrever(chave: string, valor: unknown): void {
  try {
    if (valor === null || valor === undefined) {
      window.localStorage.removeItem(chave);
    } else {
      window.localStorage.setItem(chave, JSON.stringify(valor));
    }
  } catch {
    /* ignore */
  }
  // 'storage' só dispara em outras abas; este evento sincroniza a aba atual.
  window.dispatchEvent(new Event(EVENTO_LOCAL));
}

/**
 * Estado espelhado no localStorage. Passe um `padrao` estável (constante de
 * módulo), pois ele também é o snapshot do SSR.
 */
export function useLocalStorage<T>(
  chave: string,
  padrao: T,
  leitor?: () => T,
): [T, (valor: T | null) => void] {
  const subscribe = useCallback(
    (aoMudar: () => void) => {
      const handler = (e: StorageEvent) => {
        if (e.key === null || e.key === chave) aoMudar();
      };
      window.addEventListener("storage", handler);
      window.addEventListener(EVENTO_LOCAL, aoMudar);
      return () => {
        window.removeEventListener("storage", handler);
        window.removeEventListener(EVENTO_LOCAL, aoMudar);
      };
    },
    [chave],
  );

  const valor = useSyncExternalStore(
    subscribe,
    () => ler(chave, padrao, leitor),
    () => padrao,
  );

  const definir = useCallback(
    (novo: T | null) => escrever(chave, novo),
    [chave],
  );

  return [valor, definir];
}

/** `false` no SSR/hidratação, `true` após montar — para gates client-only. */
export function useMontado(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export interface DataAtual {
  ano: number;
  mes: number;
  dia: number;
}

// Computada uma vez no cliente (snapshot estável para o useSyncExternalStore).
let hojeCache: DataAtual | null = null;
function getHoje(): DataAtual {
  if (!hojeCache) {
    const d = new Date();
    hojeCache = { ano: d.getFullYear(), mes: d.getMonth(), dia: d.getDate() };
  }
  return hojeCache;
}

/**
 * Data de hoje, client-only e hidratação-safe: no SSR devolve `padrao` (passe
 * uma constante estável); no cliente, a data real. Evita `new Date()` no render.
 */
export function useHoje(padrao: DataAtual): DataAtual {
  return useSyncExternalStore(
    () => () => {},
    getHoje,
    () => padrao,
  );
}

/** `window.location.hash` de forma segura para SSR (servidor devolve ""). */
export function useHash(): string {
  return useSyncExternalStore(
    (aoMudar) => {
      window.addEventListener("hashchange", aoMudar);
      return () => window.removeEventListener("hashchange", aoMudar);
    },
    () => window.location.hash,
    () => "",
  );
}
