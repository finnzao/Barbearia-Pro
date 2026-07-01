"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button, Input } from "@/ds/components";
import { useLocalStorage, useMontado } from "@/lib/client-hooks";
import {
  ApiError,
  cancelarAgendamentoCliente,
  CHAVE_SESSAO,
  getMeusAgendamentos,
  lerSessaoCliente,
  loginOtp,
  loginSenha,
  sairCliente,
  solicitarOtp,
  type AgendamentoCliente,
  type ClienteSessao,
} from "@/lib/publico-api";
import "../publico.css";

function formatarQuando(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ContaCliente() {
  const { slug } = useParams<{ slug: string }>();

  // Sessão do cliente espelhada no localStorage (hidratação-safe).
  const [sessao, setSessao] = useLocalStorage<ClienteSessao | null>(
    CHAVE_SESSAO,
    null,
    lerSessaoCliente,
  );
  const montado = useMontado();

  if (!montado) {
    return <div className="pb-tela" />;
  }

  return (
    <div className="pb-tela">
      <div className="pb-card">
        {sessao ? (
          <Area sessao={sessao} aoSair={() => setSessao(null)} slug={slug} />
        ) : (
          <Login slug={slug} aoEntrar={setSessao} />
        )}
      </div>
    </div>
  );
}

function Login({
  slug,
  aoEntrar,
}: {
  slug: string;
  aoEntrar: (s: ClienteSessao) => void;
}) {
  const [modo, setModo] = useState<"otp" | "senha">("otp");
  const [whatsapp, setWhatsapp] = useState("");
  const [codigo, setCodigo] = useState("");
  const [senha, setSenha] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [dicaCodigo, setDicaCodigo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function enviarCodigo() {
    setErro(null);
    setCarregando(true);
    try {
      const r = await solicitarOtp(slug, whatsapp.trim());
      setEnviado(true);
      setDicaCodigo(r.codigo ?? null);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Falha ao enviar o código.");
    } finally {
      setCarregando(false);
    }
  }

  async function entrar() {
    setErro(null);
    setCarregando(true);
    try {
      const sessao =
        modo === "otp"
          ? await loginOtp(slug, whatsapp.trim(), codigo.trim())
          : await loginSenha(slug, whatsapp.trim(), senha);
      aoEntrar(sessao);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível entrar.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <>
      <div className="pb-topo">
        <div className="pb-topo__nome">Minha conta</div>
        <div className="pb-topo__sub">
          {modo === "otp" ? "Entre com o código do WhatsApp" : "Entre com sua senha"}
        </div>
      </div>

      <div className="pb-secao">
        {erro && <div className="pb-erro">{erro}</div>}
        <Input
          label="WhatsApp"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="11999990000"
        />

        {modo === "otp" ? (
          <>
            {!enviado ? (
              <Button
                fullWidth
                loading={carregando}
                disabled={whatsapp.trim().length < 8 || carregando}
                onClick={enviarCodigo}
              >
                Enviar código
              </Button>
            ) : (
              <>
                <Input
                  label="Código (6 dígitos)"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  placeholder="000000"
                  hint={dicaCodigo ? `Código (dev): ${dicaCodigo}` : undefined}
                />
                <Button
                  fullWidth
                  loading={carregando}
                  disabled={codigo.trim().length !== 6 || carregando}
                  onClick={entrar}
                >
                  Entrar
                </Button>
              </>
            )}
          </>
        ) : (
          <>
            <Input
              label="Senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
            <Button
              fullWidth
              loading={carregando}
              disabled={!senha || carregando}
              onClick={entrar}
            >
              Entrar
            </Button>
          </>
        )}

        <p className="pb-link">
          <button
            type="button"
            className="pb-link"
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent, #b08443)" }}
            onClick={() => {
              setModo(modo === "otp" ? "senha" : "otp");
              setErro(null);
            }}
          >
            {modo === "otp"
              ? "Prefiro entrar com senha"
              : "Entrar com código do WhatsApp"}
          </button>
        </p>
      </div>

      <p className="pb-link">
        <Link href={`/agendar/${slug}`}>Voltar para agendar</Link>
      </p>
    </>
  );
}

function Area({
  sessao,
  aoSair,
  slug,
}: {
  sessao: ClienteSessao;
  aoSair: () => void;
  slug: string;
}) {
  const [agendamentos, setAgendamentos] = useState<AgendamentoCliente[]>([]);
  const [estado, setEstado] = useState<"carregando" | "ok" | "erro">(
    "carregando",
  );

  const carregar = useCallback(() => {
    getMeusAgendamentos()
      .then((a) => {
        setAgendamentos(a);
        setEstado("ok");
      })
      .catch(() => setEstado("erro"));
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function cancelar(id: string) {
    try {
      await cancelarAgendamentoCliente(id);
      carregar();
    } catch {
      /* mantém */
    }
  }

  function sair() {
    sairCliente();
    aoSair();
  }

  return (
    <>
      <div className="pb-topo">
        <div className="pb-topo__nome">Olá, {sessao.cliente.nome}</div>
        <div className="pb-topo__sub">Seus agendamentos</div>
      </div>

      <div className="pb-secao">
        {estado === "carregando" && <p className="pb-vazio">Carregando…</p>}
        {estado === "erro" && (
          <p className="pb-vazio">Não foi possível carregar.</p>
        )}
        {estado === "ok" && agendamentos.length === 0 && (
          <p className="pb-vazio">Você ainda não tem agendamentos.</p>
        )}
        {estado === "ok" && agendamentos.length > 0 && (
          <div className="pb-lista">
            {agendamentos.map((a) => (
              <div key={a.id} className="pb-item">
                <div>
                  <div className="pb-item__quando">
                    {formatarQuando(a.inicio)}
                  </div>
                  <div className="pb-item__meta">
                    {a.servico?.nome ?? "Serviço"}
                    {a.profissional ? ` · ${a.profissional.apelido}` : ""} ·{" "}
                    {a.status}
                  </div>
                </div>
                {a.status !== "cancelado" && a.status !== "concluido" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => cancelar(a.id)}
                  >
                    Cancelar
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="pb-link">
        <Link href={`/agendar/${slug}`}>Novo agendamento</Link>
      </p>
      <p className="pb-link">
        <button
          type="button"
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ledger-ink, #777)" }}
          onClick={sair}
        >
          Sair
        </button>
      </p>
    </>
  );
}
