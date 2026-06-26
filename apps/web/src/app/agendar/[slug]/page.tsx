"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Input } from "@/ds/components";
import { formatBRL } from "@/lib/money";
import {
  agendarPublico,
  ApiError,
  getHorariosPublico,
  getProfissionaisPublico,
  getResumo,
  getServicosPublico,
  type BarbeariaPublica,
  type ProfissionalPublico,
  type ServicoPublico,
} from "@/lib/publico-api";
import "./publico.css";

type Passo = "servico" | "profissional" | "horario" | "dados" | "sucesso";

function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function AgendarPublico() {
  const { slug } = useParams<{ slug: string }>();

  const [barbearia, setBarbearia] = useState<BarbeariaPublica | null>(null);
  const [servicos, setServicos] = useState<ServicoPublico[]>([]);
  const [profissionais, setProfissionais] = useState<ProfissionalPublico[]>([]);
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const [passo, setPasso] = useState<Passo>("servico");
  const [servicoId, setServicoId] = useState<string>("");
  const [profissionalId, setProfissionalId] = useState<string | undefined>();
  const [data, setData] = useState<string>(hojeISO);
  const [horarios, setHorarios] = useState<{ hora: string }[]>([]);
  const [hora, setHora] = useState<string>("");
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    getResumo(slug)
      .then((b) => {
        setBarbearia(b);
        return Promise.all([
          getServicosPublico(slug),
          getProfissionaisPublico(slug),
        ]);
      })
      .then(([s, p]) => {
        setServicos(s);
        setProfissionais(p);
      })
      .catch(() => setErroGeral("Barbearia não encontrada."));
  }, [slug]);

  useEffect(() => {
    if (passo !== "horario" || !servicoId) return;
    setHora("");
    getHorariosPublico(slug, data, servicoId, profissionalId)
      .then(setHorarios)
      .catch(() => setHorarios([]));
  }, [passo, slug, data, servicoId, profissionalId]);

  const servico = servicos.find((s) => s.id === servicoId);

  function escolherServico(id: string) {
    setServicoId(id);
    if (barbearia?.clienteEscolheProfissional && profissionais.length > 0) {
      setPasso("profissional");
    } else {
      setProfissionalId(undefined);
      setPasso("horario");
    }
  }

  function escolherProfissional(id?: string) {
    setProfissionalId(id);
    setPasso("horario");
  }

  const podeConfirmar =
    nome.trim().length >= 2 && /^\+?[0-9]{8,15}$/.test(whatsapp.trim());

  async function confirmar() {
    setErro(null);
    setEnviando(true);
    try {
      await agendarPublico(slug, {
        servicoId,
        profissionalId,
        data,
        hora,
        nome: nome.trim(),
        whatsapp: whatsapp.trim(),
      });
      setPasso("sucesso");
    } catch (e) {
      setErro(
        e instanceof ApiError ? e.message : "Não foi possível agendar.",
      );
    } finally {
      setEnviando(false);
    }
  }

  if (erroGeral) {
    return (
      <div className="pb-tela">
        <div className="pb-card">
          <div className="pb-erro">{erroGeral}</div>
        </div>
      </div>
    );
  }

  const ordemPassos: Passo[] = ["servico", "profissional", "horario", "dados"];
  const indiceAtual = ordemPassos.indexOf(passo);

  return (
    <div className="pb-tela">
      <div className="pb-card">
        <div className="pb-topo">
          <div className="pb-topo__nome">{barbearia?.nome ?? "Agendar"}</div>
          <div className="pb-topo__sub">Agende seu horário</div>
        </div>

        {passo !== "sucesso" && (
          <div className="pb-passos">
            {ordemPassos.map((p, i) => (
              <span
                key={p}
                className={i <= indiceAtual ? "pb-passo pb-passo--on" : "pb-passo"}
              />
            ))}
          </div>
        )}

        {passo === "servico" && (
          <div className="pb-secao">
            <h2 className="pb-secao__titulo">Escolha o serviço</h2>
            {servicos.length === 0 && (
              <p className="pb-vazio">Nenhum serviço disponível.</p>
            )}
            {servicos.map((s) => (
              <button
                key={s.id}
                type="button"
                className="pb-opcao"
                onClick={() => escolherServico(s.id)}
              >
                <span>
                  <span className="pb-opcao__nome">{s.nome}</span>
                  <span className="pb-opcao__meta"> · {s.duracaoMin} min</span>
                </span>
                <span className="pb-opcao__preco">
                  {formatBRL(s.precoCentavos)}
                </span>
              </button>
            ))}
          </div>
        )}

        {passo === "profissional" && (
          <div className="pb-secao">
            <h2 className="pb-secao__titulo">Escolha o profissional</h2>
            <button
              type="button"
              className="pb-opcao"
              onClick={() => escolherProfissional(undefined)}
            >
              <span className="pb-opcao__nome">Qualquer profissional</span>
            </button>
            {profissionais.map((p) => (
              <button
                key={p.id}
                type="button"
                className="pb-opcao"
                onClick={() => escolherProfissional(p.id)}
              >
                <span className="pb-opcao__nome">{p.nome}</span>
              </button>
            ))}
          </div>
        )}

        {passo === "horario" && (
          <div className="pb-secao">
            <h2 className="pb-secao__titulo">Escolha data e horário</h2>
            <Input
              type="date"
              value={data}
              min={hojeISO()}
              onChange={(e) => setData(e.target.value)}
              aria-label="Data"
            />
            {horarios.length === 0 ? (
              <p className="pb-vazio">Sem horários livres neste dia.</p>
            ) : (
              <div className="pb-horarios">
                {horarios.map((h) => (
                  <button
                    key={h.hora}
                    type="button"
                    className={
                      hora === h.hora ? "pb-hora pb-hora--ativa" : "pb-hora"
                    }
                    onClick={() => setHora(h.hora)}
                  >
                    {h.hora}
                  </button>
                ))}
              </div>
            )}
            <Button
              fullWidth
              disabled={!hora}
              onClick={() => setPasso("dados")}
            >
              Continuar
            </Button>
          </div>
        )}

        {passo === "dados" && (
          <div className="pb-secao">
            <h2 className="pb-secao__titulo">Seus dados</h2>
            {servico && (
              <p className="pb-opcao__meta">
                {servico.nome} · {data} às {hora} · {formatBRL(servico.precoCentavos)}
              </p>
            )}
            {erro && <div className="pb-erro">{erro}</div>}
            <Input
              label="Nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Seu nome"
              required
            />
            <Input
              label="WhatsApp"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="11999990000"
              required
            />
            <Button
              fullWidth
              loading={enviando}
              disabled={!podeConfirmar || enviando}
              onClick={confirmar}
            >
              Confirmar agendamento
            </Button>
          </div>
        )}

        {passo === "sucesso" && (
          <div className="pb-secao">
            <div className="pb-sucesso">
              <span className="pb-sucesso__check">✓</span>
              <h2 className="pb-secao__titulo">Agendamento solicitado!</h2>
              <p className="pb-opcao__meta">
                {servico?.nome} · {data} às {hora}. A barbearia vai confirmar.
              </p>
            </div>
            <p className="pb-link">
              <Link href={`/agendar/${slug}/conta`}>
                Acompanhar meus agendamentos
              </Link>
            </p>
          </div>
        )}

        <p className="pb-link">
          <Link href={`/agendar/${slug}/conta`}>Já é cliente? Entrar</Link>
        </p>
      </div>
    </div>
  );
}
