"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
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

function lerSessao(): Sessao | null {
  try {
    const cru = window.localStorage.getItem(CHAVE);
    return cru ? (JSON.parse(cru) as Sessao) : null;
  } catch {
    return null;
  }
}

function gravarSessao(sessao: Sessao | null) {
  try {
    if (sessao) {
      window.localStorage.setItem(CHAVE, JSON.stringify(sessao));
    } else {
      window.localStorage.removeItem(CHAVE);
    }
  } catch {
    /* ignore */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("carregando");
  const [usuario, setUsuario] = useState<UsuarioAuth | null>(null);
  const sessao = useRef<Sessao | null>(null);

  const aplicar = useCallback((nova: Sessao | null) => {
    sessao.current = nova;
    gravarSessao(nova);
    setUsuario(nova?.usuario ?? null);
    setStatus(nova ? "autenticado" : "deslogado");
  }, []);

  useEffect(() => {
    const atual = lerSessao();
    sessao.current = atual;
    setUsuario(atual?.usuario ?? null);
    setStatus(atual ? "autenticado" : "deslogado");
  }, []);

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
