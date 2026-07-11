import type { DiaSemana, HorarioSemana } from "./horarios";
import type { ConfigAgendamento } from "./settings";
import type { AnaliseSemana } from "./mock-data";
import type { OrigemRepasse, Repasse, StatusRepasse } from "./repasse";
import type {
  Agendamento,
  AssinaturaCliente,
  Cliente,
  ClienteRecorrente,
  ComissaoProfissional,
  CortesDia,
  FaixaHora,
  FaturamentoMes,
  FormaPagamentoResumo,
  MetodoCobranca,
  MetodoPagamento,
  Periodo,
  Plano,
  Profissional,
  ReceitaProfissional,
  RelatorioFinanceiro,
  ResumoHoje,
  Servico,
  ServicoRealizado,
  StatusPagamento,
  TipoChavePix,
  UsoAssinatura,
} from "./types";

// ---------------------------------------------------------------------------
// Camada única de acesso a dados. Fala com a API real do Nest; o token vem da
// sessão salva pelo auth-context (localStorage). Os componentes continuam
// consumindo as mesmas funções tipadas — o mapeamento para os tipos do front
// (dinheiro em centavos no campo `preco`/`faturado`) acontece só aqui.
// ---------------------------------------------------------------------------

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333/api";

const CHAVE_SESSAO = "naregua:auth";
// Mesmo evento do useLocalStorage: gravar por aqui mantém o auth-context em dia.
const EVENTO_LOCAL = "naregua:localstorage";

interface SessaoLocal {
  accessToken: string;
  refreshToken: string;
  usuario: unknown;
}

function sessaoAtual(): SessaoLocal | null {
  if (typeof window === "undefined") return null;
  try {
    const cru = window.localStorage.getItem(CHAVE_SESSAO);
    return cru ? (JSON.parse(cru) as SessaoLocal) : null;
  } catch {
    return null;
  }
}

function gravarSessao(sessao: SessaoLocal | null): void {
  try {
    if (sessao) {
      window.localStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao));
    } else {
      window.localStorage.removeItem(CHAVE_SESSAO);
    }
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(EVENTO_LOCAL));
}

// Uma renovação por vez: chamadas paralelas que tomaram 401 esperam a mesma
// promise — o refresh token rotaciona no servidor, e dois refreshes em corrida
// revogariam um ao outro e derrubariam a sessão.
let renovacaoEmVoo: Promise<string | null> | null = null;
function renovarSessao(): Promise<string | null> {
  renovacaoEmVoo ??= (async () => {
    const sessao = sessaoAtual();
    if (!sessao?.refreshToken) return null;
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: sessao.refreshToken }),
      });
      if (!res.ok) {
        // Refresh revogado/expirado: a sessão morreu de vez — limpa e o guard
        // de rota leva pro login.
        gravarSessao(null);
        return null;
      }
      const tokens = (await res.json()) as SessaoLocal;
      gravarSessao(tokens);
      return tokens.accessToken;
    } catch {
      return null; // falha de rede: mantém a sessão; o erro original sobe
    } finally {
      renovacaoEmVoo = null;
    }
  })();
  return renovacaoEmVoo;
}

async function ler<T>(res: Response): Promise<T> {
  const corpo = await res.json().catch(() => null);
  if (!res.ok) {
    const erro = corpo?.error;
    throw new Error(erro?.message ?? "Falha na requisição.");
  }
  return corpo as T;
}

// O access token dura 15 min: todo request que tomar 401 renova a sessão com o
// refresh token (revogável, rotacionado) e repete UMA vez. Sem isso, qualquer
// tela aberta há mais de 15 min quebrava em silêncio.
async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const exec = (token: string | null | undefined) =>
    fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

  let res = await exec(sessaoAtual()?.accessToken);
  if (res.status === 401) {
    const novoToken = await renovarSessao();
    if (novoToken) {
      res = await exec(novoToken);
    }
  }
  return ler<T>(res);
}

async function apiGet<T>(path: string): Promise<T> {
  return apiFetch<T>(path, { cache: "no-store" });
}

export async function apiSend<T>(
  path: string,
  metodo: "POST" | "PATCH" | "PUT" | "DELETE",
  corpo?: unknown,
): Promise<T> {
  return apiFetch<T>(path, {
    method: metodo,
    headers: { "Content-Type": "application/json" },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
}

interface ServicoApi {
  id: string;
  nome: string;
  duracaoMin: number;
  precoCentavos: number;
}
interface ProfissionalApi {
  id: string;
  nome: string;
  apelido: string;
  comissaoPercent: string | number;
  chavePix: string | null;
  pixTipoChave: Profissional["pixTipoChave"] | null;
  ativo: boolean;
}
interface AgendamentoApi {
  id: string;
  profissionalId: string | null;
  clienteNome: string | null;
  precoCentavos: number | null;
  inicio: string;
  status: Agendamento["status"];
  profissional?: { apelido: string } | null;
  servico?: { nome: string } | null;
}

export interface AgendamentoMes {
  id: string;
  inicio: string;
  status: Agendamento["status"];
  clienteNome: string;
  precoCentavos: number;
  profissionalId: string;
  profissional: string;
  servico: string;
}
interface ComissaoApi {
  profissionalId: string;
  profissional: string;
  atendimentos: number;
  faturadoCentavos: number;
  comissaoCentavos: number;
  liquidoBarbeariaCentavos: number;
}
interface RelatorioApi {
  faturamentoCentavos: number;
  comissoesCentavos: number;
  liquidoCentavos: number;
  atendimentos: number;
  ticketMedioCentavos: number;
}

function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function hora(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function getServicos(): Promise<Servico[]> {
  const dados = await apiGet<ServicoApi[]>("/servicos");
  return dados.map((s) => ({
    id: s.id,
    nome: s.nome,
    duracaoMin: s.duracaoMin,
    preco: s.precoCentavos,
  }));
}

export async function criarServico(dados: {
  nome: string;
  duracaoMin: number;
  precoCentavos: number;
}): Promise<Servico> {
  const s = await apiSend<ServicoApi>("/servicos", "POST", dados);
  return {
    id: s.id,
    nome: s.nome,
    duracaoMin: s.duracaoMin,
    preco: s.precoCentavos,
  };
}

export async function getClientes(): Promise<Cliente[]> {
  return apiGet<Cliente[]>("/clientes");
}

export async function criarCliente(dados: {
  nome: string;
  whatsapp: string;
}): Promise<Cliente> {
  return apiSend<Cliente>("/clientes", "POST", dados);
}

interface PlanoApi {
  id: string;
  nome: string;
  precoCentavos: number;
  ativo: boolean;
  itens: {
    servicoId: string;
    quantidadeMes: number;
    servico: { nome: string };
  }[];
}
interface AssinaturaClienteApi {
  id: string;
  clienteId: string;
  planoId: string;
  metodoCobranca: MetodoCobranca;
  status: AssinaturaCliente["status"];
  assinadoEm: string;
  ultimoCicloPagoEm: string | null;
  plano: PlanoApi;
}

function mapPlano(p: PlanoApi): Plano {
  return {
    id: p.id,
    nome: p.nome,
    preco: p.precoCentavos,
    ativo: p.ativo,
    itens: p.itens.map((i) => ({
      servicoId: i.servicoId,
      servicoNome: i.servico.nome,
      quantidadeMes: i.quantidadeMes,
    })),
  };
}

function mapAssinatura(a: AssinaturaClienteApi): AssinaturaCliente {
  return {
    id: a.id,
    clienteId: a.clienteId,
    planoId: a.planoId,
    metodoCobranca: a.metodoCobranca,
    status: a.status,
    assinadoEm: a.assinadoEm,
    ultimoCicloPagoEm: a.ultimoCicloPagoEm,
    plano: mapPlano(a.plano),
  };
}

export async function getPlanos(): Promise<Plano[]> {
  const dados = await apiGet<PlanoApi[]>("/planos");
  return dados.map(mapPlano);
}

export async function criarPlano(dados: {
  nome: string;
  precoCentavos: number;
  itens: { servicoId: string; quantidadeMes: number }[];
}): Promise<Plano> {
  const p = await apiSend<PlanoApi>("/planos", "POST", dados);
  return mapPlano(p);
}

export async function getAssinaturasPorCliente(
  clienteId: string,
): Promise<AssinaturaCliente[]> {
  const dados = await apiGet<AssinaturaClienteApi[]>(
    `/assinaturas-cliente?clienteId=${clienteId}`,
  );
  return dados.map(mapAssinatura);
}

export async function criarAssinaturaCliente(dados: {
  clienteId: string;
  planoId: string;
  metodoCobranca?: MetodoCobranca;
}): Promise<AssinaturaCliente> {
  const a = await apiSend<AssinaturaClienteApi>(
    "/assinaturas-cliente",
    "POST",
    dados,
  );
  return mapAssinatura(a);
}

export async function cancelarAssinatura(id: string): Promise<void> {
  await apiSend(`/assinaturas-cliente/${id}/cancelar`, "PATCH");
}

export async function marcarCicloPago(id: string): Promise<void> {
  await apiSend(`/assinaturas-cliente/${id}/pagar-ciclo`, "PATCH");
}

export async function getUsoAssinatura(id: string): Promise<UsoAssinatura> {
  return apiGet<UsoAssinatura>(`/assinaturas-cliente/${id}/uso`);
}

export async function usarPlano(id: string, servicoId: string): Promise<void> {
  await apiSend(`/assinaturas-cliente/${id}/usar`, "POST", { servicoId });
}

export async function getProfissionais(): Promise<Profissional[]> {
  const dados = await apiGet<ProfissionalApi[]>("/profissionais");
  return dados.map((p) => ({
    id: p.id,
    nome: p.nome,
    apelido: p.apelido,
    comissaoPercent: Number(p.comissaoPercent),
    chavePix: p.chavePix ?? undefined,
    pixTipoChave: p.pixTipoChave ?? undefined,
    ativo: p.ativo,
  }));
}

export async function criarProfissional(dados: {
  nome: string;
  apelido: string;
  comissaoPercent: number;
  chavePix?: string;
  pixTipoChave?: TipoChavePix;
}): Promise<Profissional> {
  const p = await apiSend<ProfissionalApi>("/profissionais", "POST", dados);
  return {
    id: p.id,
    nome: p.nome,
    apelido: p.apelido,
    comissaoPercent: Number(p.comissaoPercent),
    chavePix: p.chavePix ?? undefined,
    pixTipoChave: p.pixTipoChave ?? undefined,
    ativo: p.ativo,
  };
}

export async function getAgendamentos(data = hojeISO()): Promise<Agendamento[]> {
  const dados = await apiGet<AgendamentoApi[]>(`/agendamentos?data=${data}`);
  return dados.map((a) => ({
    id: a.id,
    hora: hora(a.inicio),
    cliente: a.clienteNome ?? "",
    servico: a.servico?.nome ?? "",
    profissionalId: a.profissionalId ?? "",
    profissional: a.profissional?.apelido ?? "",
    preco: a.precoCentavos ?? 0,
    status: a.status,
  }));
}

export async function getAgendamentosPeriodo(
  de: string,
  ate: string,
): Promise<AgendamentoMes[]> {
  const dados = await apiGet<AgendamentoApi[]>(
    `/agendamentos?de=${de}&ate=${ate}`,
  );
  return dados.map((a) => ({
    id: a.id,
    inicio: a.inicio,
    status: a.status,
    clienteNome: a.clienteNome ?? "",
    precoCentavos: a.precoCentavos ?? 0,
    profissionalId: a.profissionalId ?? "",
    profissional: a.profissional?.apelido ?? "",
    servico: a.servico?.nome ?? "",
  }));
}

export async function criarAgendamento(dados: {
  inicio: string;
  fim: string;
  profissionalId?: string;
  servicoId?: string;
  clienteNome?: string;
  precoCentavos?: number;
  status?: Agendamento["status"];
}): Promise<void> {
  await apiSend("/agendamentos", "POST", dados);
}

export async function getComissoes(params?: {
  de?: string;
  ate?: string;
}): Promise<ComissaoProfissional[]> {
  const query = params?.de && params?.ate ? `?de=${params.de}&ate=${params.ate}` : "";
  const dados = await apiGet<ComissaoApi[]>(`/comissoes${query}`);
  return dados.map((c) => ({
    profissionalId: c.profissionalId,
    profissional: c.profissional,
    atendimentos: c.atendimentos,
    faturado: c.faturadoCentavos,
    comissaoPercent: 0,
    comissao: c.comissaoCentavos,
    liquidoBarbearia: c.liquidoBarbeariaCentavos,
  }));
}

interface RepasseApi {
  id: string;
  profissionalId: string;
  periodoInicio: string;
  periodoFim: string;
  valorCentavos: number;
  origem: OrigemRepasse;
  status: StatusRepasse;
  criadoEm: string;
  pagoEm: string | null;
}

function mapRepasse(r: RepasseApi, profs: Profissional[]): Repasse {
  return {
    id: r.id,
    profissionalId: r.profissionalId,
    profissional: profs.find((p) => p.id === r.profissionalId)?.apelido ?? "",
    periodoInicio: r.periodoInicio.slice(0, 10),
    periodoFim: r.periodoFim.slice(0, 10),
    valor: r.valorCentavos,
    origem: r.origem,
    status: r.status,
    data: (r.pagoEm ?? r.criadoEm).slice(0, 10),
  };
}

export async function getRepasses(profs: Profissional[]): Promise<Repasse[]> {
  const dados = await apiGet<RepasseApi[]>("/repasses");
  return dados.map((r) => mapRepasse(r, profs));
}

export async function criarRepasseApi(
  dados: {
    profissionalId: string;
    periodoInicio: string;
    periodoFim: string;
    valorCentavos: number;
    origem: OrigemRepasse;
  },
  profs: Profissional[],
): Promise<Repasse> {
  const r = await apiSend<RepasseApi>("/repasses", "POST", dados);
  return mapRepasse(r, profs);
}

export async function getResumoHoje(): Promise<ResumoHoje> {
  const hoje = hojeISO();
  const [relatorio, proximos, comissoes] = await Promise.all([
    apiGet<RelatorioApi>(`/relatorios/financeiro?de=${hoje}&ate=${hoje}`),
    getAgendamentos(hoje),
    getComissoes(),
  ]);
  return {
    data: new Date().toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    }),
    faturamento: relatorio.faturamentoCentavos,
    atendimentos: relatorio.atendimentos,
    ticketMedio: relatorio.ticketMedioCentavos,
    comissoesApagar: comissoes.reduce((s, c) => s + c.comissao, 0),
    proximos,
    comissoes,
  };
}

export interface PagamentoLista {
  id: string;
  profissionalId: string;
  agendamentoId: string | null;
  servicoNome: string | null;
  valorCentavos: number;
  comissaoPercent: string | number;
  metodo: MetodoPagamento;
  status: StatusPagamento;
  pagoEm: string | null;
  txid: string | null;
  copiaCola: string | null;
  /** Só vem na resposta da criação de um pix_dinamico (não persiste). */
  qrCodeBase64?: string;
}

export function getPagamentos(): Promise<PagamentoLista[]> {
  return apiGet<PagamentoLista[]>("/pagamentos");
}

export function getPagamento(id: string): Promise<PagamentoLista> {
  return apiGet<PagamentoLista>(`/pagamentos/${id}`);
}

export function criarPagamento(dados: {
  profissionalId: string;
  valorCentavos: number;
  metodo: MetodoPagamento;
  servicoNome?: string;
  servicoId?: string;
}): Promise<PagamentoLista> {
  return apiSend<PagamentoLista>("/pagamentos", "POST", dados);
}

export function darBaixaPagamento(id: string): Promise<PagamentoLista> {
  return apiSend<PagamentoLista>(`/pagamentos/${id}/pagar`, "PATCH");
}

// Conexão da conta Mercado Pago da barbearia (OAuth marketplace) — só dono.
export interface MercadoPagoStatus {
  conectado: boolean;
  mpUserId: string | null;
}

export function getMercadoPagoStatus(): Promise<MercadoPagoStatus> {
  return apiGet<MercadoPagoStatus>("/pagamentos/mercadopago/status");
}

export function getMercadoPagoConexaoUrl(): Promise<{ url: string }> {
  return apiGet<{ url: string }>("/pagamentos/mercadopago/conectar");
}

interface ConfigApi {
  clienteEscolheProfissional: boolean;
  clienteEscolheServico: boolean;
}

export async function getConfigAgendamento(): Promise<ConfigAgendamento> {
  const c = await apiGet<ConfigApi>("/config");
  return {
    clienteEscolheProfissional: c.clienteEscolheProfissional,
    clienteEscolheServico: c.clienteEscolheServico,
  };
}

export async function salvarConfigAgendamento(
  cfg: ConfigAgendamento,
): Promise<void> {
  await apiSend("/config", "PATCH", cfg);
}

interface HorarioApi {
  diaSemana: number;
  abre: string;
  fecha: string;
}

const DIAS_SEMANA: DiaSemana[] = [0, 1, 2, 3, 4, 5, 6];

export async function getHorarios(): Promise<HorarioSemana> {
  const linhas = await apiGet<HorarioApi[]>("/config/horarios");
  const base = Object.fromEntries(
    DIAS_SEMANA.map((d) => [d, { aberto: false, abre: "09:00", fecha: "18:00" }]),
  ) as HorarioSemana;
  for (const linha of linhas) {
    base[linha.diaSemana as DiaSemana] = {
      aberto: true,
      abre: linha.abre.slice(11, 16),
      fecha: linha.fecha.slice(11, 16),
    };
  }
  return base;
}

export async function salvarHorarios(horario: HorarioSemana): Promise<void> {
  const horarios = DIAS_SEMANA.filter((d) => horario[d].aberto).map((d) => ({
    diaSemana: d,
    abre: horario[d].abre,
    fecha: horario[d].fecha,
  }));
  await apiSend("/config/horarios", "PUT", { horarios });
}

export function intervaloPeriodo(periodo: Periodo): { de: string; ate: string } {
  const hoje = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  if (periodo === "dia") {
    const d = iso(hoje);
    return { de: d, ate: d };
  }
  if (periodo === "semana") {
    const inicio = new Date(hoje);
    inicio.setDate(hoje.getDate() - 6);
    return { de: iso(inicio), ate: iso(hoje) };
  }
  const primeiro = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const ultimo = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
  return { de: iso(primeiro), ate: iso(ultimo) };
}

interface ServicoRealizadoApi {
  servico: string;
  quantidade: number;
  receitaCentavos: number;
}

interface FormaPagamentoApi {
  metodo: string;
  quantidade: number;
  totalCentavos: number;
}

export async function getRelatorioFinanceiro(
  periodo: Periodo,
): Promise<RelatorioFinanceiro> {
  const { de, ate } = intervaloPeriodo(periodo);
  const r = await apiGet<RelatorioApi>(
    `/relatorios/financeiro?de=${de}&ate=${ate}`,
  );
  return {
    faturamento: r.faturamentoCentavos,
    comissoes: r.comissoesCentavos,
    liquido: r.liquidoCentavos,
    atendimentos: r.atendimentos,
    ticketMedio: r.ticketMedioCentavos,
  };
}

export async function getReceitaProfissional(
  periodo: Periodo,
): Promise<ReceitaProfissional[]> {
  const { de, ate } = intervaloPeriodo(periodo);
  const dados = await apiGet<ComissaoApi[]>(
    `/comissoes?de=${de}&ate=${ate}`,
  );
  return dados.map((c) => ({
    profissionalId: c.profissionalId,
    profissional: c.profissional,
    atendimentos: c.atendimentos,
    receita: c.faturadoCentavos,
    comissao: c.comissaoCentavos,
    liquido: c.liquidoBarbeariaCentavos,
  }));
}

export async function getServicosRealizados(
  periodo: Periodo,
): Promise<ServicoRealizado[]> {
  const { de, ate } = intervaloPeriodo(periodo);
  const dados = await apiGet<ServicoRealizadoApi[]>(
    `/relatorios/servicos?de=${de}&ate=${ate}`,
  );
  return dados.map((s) => ({
    servico: s.servico,
    quantidade: s.quantidade,
    receita: s.receitaCentavos,
  }));
}

export async function getFormasPagamento(
  periodo: Periodo,
): Promise<FormaPagamentoResumo[]> {
  const { de, ate } = intervaloPeriodo(periodo);
  const dados = await apiGet<FormaPagamentoApi[]>(
    `/relatorios/formas-pagamento?de=${de}&ate=${ate}`,
  );
  return dados.map((f) => ({
    metodo: f.metodo as MetodoPagamento,
    quantidade: f.quantidade,
    total: f.totalCentavos,
  }));
}

interface EvolucaoApi {
  mes: string;
  faturamentoCentavos: number;
}

export async function getEvolucaoMensal(): Promise<FaturamentoMes[]> {
  const dados = await apiGet<EvolucaoApi[]>("/relatorios/evolucao");
  return dados.map((e) => ({ mes: e.mes, faturamento: e.faturamentoCentavos }));
}

interface PicoDiaApi {
  dia: string;
  cortes: number;
  faturamentoCentavos: number;
}
interface PicosApi {
  dias: PicoDiaApi[];
  horas: FaixaHora[];
}

export async function getPicos(): Promise<{
  analise: AnaliseSemana;
  horas: FaixaHora[];
}> {
  const p = await apiGet<PicosApi>("/relatorios/picos");
  const dias: CortesDia[] = p.dias.map((d) => ({
    dia: d.dia,
    cortes: d.cortes,
    faturamento: d.faturamentoCentavos,
  }));
  const ordenado = [...dias].sort((a, b) => a.cortes - b.cortes);
  const analise: AnaliseSemana = {
    dias,
    menosMovimentado: ordenado[0],
    maisMovimentado: ordenado[ordenado.length - 1],
    totalCortes: dias.reduce((s, d) => s + d.cortes, 0),
  };
  return { analise, horas: p.horas };
}

interface ClienteRecorrenteApi {
  cliente: string;
  visitas: number;
  totalCentavos: number;
}

export async function getClientesRecorrentes(): Promise<ClienteRecorrente[]> {
  const dados = await apiGet<ClienteRecorrenteApi[]>(
    "/relatorios/clientes-recorrentes",
  );
  return dados.map((c) => ({
    cliente: c.cliente,
    visitas: c.visitas,
    total: c.totalCentavos,
  }));
}
