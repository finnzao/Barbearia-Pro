const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333/api";

export const CHAVE_SESSAO = "naregua:cliente";

export interface BarbeariaPublica {
  id: string;
  nome: string;
  slug: string;
  fuso: string;
  clienteEscolheProfissional: boolean;
  clienteEscolheServico: boolean;
}
export interface ServicoPublico {
  id: string;
  nome: string;
  duracaoMin: number;
  precoCentavos: number;
}
export interface ProfissionalPublico {
  id: string;
  nome: string;
  apelido: string;
}
export interface ClienteSessao {
  accessToken: string;
  cliente: { id: string; nome: string; whatsapp: string; temSenha: boolean };
}
export interface AgendamentoCliente {
  id: string;
  inicio: string;
  fim: string;
  status: string;
  servico: { nome: string } | null;
  profissional: { apelido: string } | null;
}

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
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
    );
  }
  return corpo as T;
}

export function lerSessaoCliente(): ClienteSessao | null {
  if (typeof window === "undefined") return null;
  try {
    const cru = window.localStorage.getItem(CHAVE_SESSAO);
    return cru ? (JSON.parse(cru) as ClienteSessao) : null;
  } catch {
    return null;
  }
}

function gravarSessao(sessao: ClienteSessao): void {
  window.localStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao));
}

export function sairCliente(): void {
  try {
    window.localStorage.removeItem(CHAVE_SESSAO);
  } catch {
    /* ignore */
  }
}

function autorizado(): HeadersInit {
  const sessao = lerSessaoCliente();
  return sessao ? { Authorization: `Bearer ${sessao.accessToken}` } : {};
}

function get<T>(path: string, comAuth = false): Promise<T> {
  return fetch(`${API_BASE}${path}`, {
    cache: "no-store",
    headers: comAuth ? autorizado() : {},
  }).then((r) => ler<T>(r));
}

function post<T>(path: string, body: unknown, comAuth = false): Promise<T> {
  return fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(comAuth ? autorizado() : {}) },
    body: JSON.stringify(body),
  }).then((r) => ler<T>(r));
}

// ---- Público (sem login) ----
export function getResumo(slug: string): Promise<BarbeariaPublica> {
  return get(`/publico/${slug}`);
}
export function getServicosPublico(slug: string): Promise<ServicoPublico[]> {
  return get(`/publico/${slug}/servicos`);
}
export function getProfissionaisPublico(
  slug: string,
): Promise<ProfissionalPublico[]> {
  return get(`/publico/${slug}/profissionais`);
}
export function getHorariosPublico(
  slug: string,
  data: string,
  servicoId: string,
  profissionalId?: string,
): Promise<{ hora: string }[]> {
  const p = profissionalId ? `&profissionalId=${profissionalId}` : "";
  return get(`/publico/${slug}/horarios?data=${data}&servicoId=${servicoId}${p}`);
}
export function agendarPublico(
  slug: string,
  dto: {
    servicoId: string;
    profissionalId?: string;
    data: string;
    hora: string;
    nome: string;
    whatsapp: string;
  },
): Promise<{ id: string; inicio: string; status: string }> {
  return post(`/publico/${slug}/agendar`, dto);
}

// ---- Login do cliente ----
export function solicitarOtp(
  slug: string,
  whatsapp: string,
): Promise<{ enviado: boolean; codigo?: string }> {
  return post(`/publico/${slug}/otp`, { whatsapp });
}
export async function loginOtp(
  slug: string,
  whatsapp: string,
  codigo: string,
): Promise<ClienteSessao> {
  const sessao = await post<ClienteSessao>(`/publico/${slug}/login/otp`, {
    whatsapp,
    codigo,
  });
  gravarSessao(sessao);
  return sessao;
}
export async function loginSenha(
  slug: string,
  whatsapp: string,
  senha: string,
): Promise<ClienteSessao> {
  const sessao = await post<ClienteSessao>(`/publico/${slug}/login/senha`, {
    whatsapp,
    senha,
  });
  gravarSessao(sessao);
  return sessao;
}

// ---- Área do cliente (token) ----
export function getMeusAgendamentos(): Promise<AgendamentoCliente[]> {
  return get(`/cliente/meus-agendamentos`, true);
}
export function cancelarAgendamentoCliente(id: string): Promise<unknown> {
  return post(`/cliente/agendamentos/${id}/cancelar`, {}, true);
}
export function definirSenhaCliente(senha: string): Promise<unknown> {
  return post(`/cliente/definir-senha`, { senha }, true);
}
