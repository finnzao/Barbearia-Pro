"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { useLocalStorage, useMontado } from "./client-hooks";
import {
  API_BASE,
  ApiError,
  loginRequest,
  logoutRequest,
  refreshRequest,
  type TokensResposta,
  type UsuarioAuth,
} from "./auth-api";

const CHAVE = "naregua:auth";

type Status = "carregando" | "autenticado" | "deslogado";

interface Sessao {
  accessToken: string;
  refreshToken: string;
  usuario: UsuarioAuth;
}

interface AuthContextValor {
  status: Status;
  usuario: UsuarioAuth | null;
  entrar: (email: string, senha: string) => Promise<UsuarioAuth>;
  sair: () => Promise<void>;
  requisitar: <T>(path: string, init?: RequestInit) => Promise<T>;
}

const AuthContext = createContext<AuthContextValor | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // A sessão vive no localStorage (hidratação-safe); usuario/status derivam dela.
  const [sessaoArmazenada, setSessao] = useLocalStorage<Sessao | null>(
    CHAVE,
    null,
  );
  const montado = useMontado();

  // Ref com a sessão atual para os fluxos assíncronos (requisitar/renovar/sair),
  // sem precisar de re-render nem entrar nas deps dos callbacks.
  const sessao = useRef<Sessao | null>(sessaoArmazenada);
  useEffect(() => {
    sessao.current = sessaoArmazenada;
  }, [sessaoArmazenada]);

  const usuario = sessaoArmazenada?.usuario ?? null;
  const status: Status = !montado
    ? "carregando"
    : sessaoArmazenada
      ? "autenticado"
      : "deslogado";

  const aplicar = useCallback(
    (nova: Sessao | null) => {
      sessao.current = nova;
      setSessao(nova); // persiste no localStorage e dispara o re-render
    },
    [setSessao],
  );

  const entrar = useCallback(
    async (email: string, senha: string) => {
      const tokens = await loginRequest(email, senha);
      aplicar(tokens);
      return tokens.usuario;
    },
    [aplicar],
  );

  const sair = useCallback(async () => {
    const atual = sessao.current;
    if (atual) {
      try {
        await logoutRequest(atual.refreshToken, atual.accessToken);
      } catch {
        /* logout é best-effort */
      }
    }
    aplicar(null);
  }, [aplicar]);

  const renovar = useCallback(async (): Promise<string | null> => {
    const atual = sessao.current;
    if (!atual) {
      return null;
    }
    try {
      const tokens: TokensResposta = await refreshRequest(atual.refreshToken);
      aplicar(tokens);
      return tokens.accessToken;
    } catch {
      aplicar(null);
      return null;
    }
  }, [aplicar]);

  const requisitar = useCallback(
    async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
      const executar = (token: string) =>
        fetch(`${API_BASE}${path}`, {
          ...init,
          headers: {
            ...(init.headers ?? {}),
            Authorization: `Bearer ${token}`,
          },
        });

      const atual = sessao.current;
      if (!atual) {
        throw new ApiError("NAO_AUTENTICADO", "Sessão expirada.", 401);
      }

      let res = await executar(atual.accessToken);
      if (res.status === 401) {
        const novoToken = await renovar();
        if (!novoToken) {
          throw new ApiError("NAO_AUTENTICADO", "Sessão expirada.", 401);
        }
        res = await executar(novoToken);
      }

      const corpo = await res.json().catch(() => null);
      if (!res.ok) {
        const erro = corpo?.error;
        throw new ApiError(
          erro?.code ?? "ERRO",
          erro?.message ?? "Erro inesperado.",
          res.status,
          erro?.details,
        );
      }
      return corpo as T;
    },
    [renovar],
  );

  return (
    <AuthContext.Provider value={{ status, usuario, entrar, sair, requisitar }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValor {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider.");
  }
  return ctx;
}
