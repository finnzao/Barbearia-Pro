export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333/api";

export type Papel = "dono" | "profissional" | "recepcao";

export interface UsuarioAuth {
  id: string;
  barbeariaId: string;
  papel: Papel;
  profissionalId: string | null;
}

export interface TokensResposta {
  accessToken: string;
  refreshToken: string;
  usuario: UsuarioAuth;
}

export interface AgendamentoFuncionario {
  id: string;
  clienteNome: string | null;
  precoCentavos: number | null;
  inicio: string;
  fim: string;
  status: string;
}

export interface ComissoesFuncionario {
  faturadoCentavos: number;
  comissaoCentavos: number;
  aReceberCentavos: number;
}

export interface RepasseFuncionario {
  id: string;
  periodoInicio: string;
  periodoFim: string;
  valorCentavos: number;
  status: string;
}

export interface RepassesFuncionario {
  repasses: RepasseFuncionario[];
  pendenteCentavos: number;
  pagoCentavos: number;
}

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function ler<T>(res: Response): Promise<T> {
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
}

function postJson<T>(path: string, body: unknown): Promise<T> {
  return fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((res) => ler<T>(res));
}

export function loginRequest(
  email: string,
  senha: string,
): Promise<TokensResposta> {
  return postJson("/auth/login", { email, senha });
}

export function refreshRequest(refreshToken: string): Promise<TokensResposta> {
  return postJson("/auth/refresh", { refreshToken });
}

export function logoutRequest(
  refreshToken: string,
  accessToken: string,
): Promise<unknown> {
  return fetch(`${API_BASE}/auth/logout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ refreshToken }),
  }).then((res) => ler(res));
}
