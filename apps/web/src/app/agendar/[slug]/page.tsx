"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Input } from "@/ds/components";
import { formatBRL } from "@/lib/money";
import { normalizarTelefone, PAIS_PADRAO, telefoneValido } from "@/lib/telefone";
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

// "Hoje" tem de ser no fuso da BARBEARIA, não em UTC: às 21h de São Paulo o UTC
// já virou o dia e a tela pulava para amanhã, escondendo as vagas da noite.
// en-CA formata como YYYY-MM-DD, que é o formato do <input type="date">.
// Sem fuso, o Intl usa o do navegador — certo para o cliente local e nunca pior
// que UTC; assim que o resumo chega, a data é recalculada no fuso real.
function hojeNoFuso(fuso?: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: fuso }).format(new Date());
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
  const [data, setData] = useState<string>(() => hojeNoFuso());
  const [horarios, setHorarios] = useState<{ hora: string }[]>([]);
  const [erroHorarios, setErroHorarios] = useState(false);
  const [hora, setHora] = useState<string>("");
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    getResumo(slug)
      .then(async (b) => {
        setBarbearia(b);
        setData(hojeNoFuso(b.fuso)); // agora o fuso da barbearia é conhecido
        const [s, p] = await Promise.all([
          getServicosPublico(slug),
          getProfissionaisPublico(slug),
        ]);
        setServicos(s);
        setProfissionais(p);
        // Barbearia define o serviço no balcão: o cliente entra direto na
        // escolha de profissional (ou de horário).
        if (!b.clienteEscolheServico) {
          setPasso(b.clienteEscolheProfissional && p.length > 0 ? "profissional" : "horario");
        }
      })
      .catch(() => setErroGeral("Barbearia não encontrada."));
  }, [slug]);

  useEffect(() => {
    // servicoId vazio é válido quando a barbearia define o serviço no balcão.
    if (passo !== "horario") return;
    let ativo = true;
    getHorariosPublico(slug, data, servicoId || undefined, profissionalId)
      .then((hs) => {
        if (!ativo) return;
        setHorarios(hs);
        setErroHorarios(false);
        setHora(""); // limpa a seleção anterior quando os novos horários chegam
      })
      .catch(() => {
        if (!ativo) return;
        // Falha ao carregar não é "dia lotado": dizer que não há vaga afastaria
        // o cliente por um erro nosso.
        setHorarios([]);
        setErroHorarios(true);
      });
    return () => {
      ativo = false;
    };
  }, [passo, slug, data, servicoId, profissionalId]);

  const servico = servicos.find((s) => s.id === servicoId);

  async function escolherServico(id: string) {
    setServicoId(id);
    setProfissionalId(undefined);
    if (!barbearia?.clienteEscolheProfissional) {
      setPasso("horario");
      return;
    }
    // Recarrega já filtrado: nem todo profissional faz todo serviço.
    const elegiveis = await getProfissionaisPublico(slug, id).catch(
      () => [] as ProfissionalPublico[],
    );
    setProfissionais(elegiveis);
    setPasso(elegiveis.length > 0 ? "profissional" : "horario");
  }

  function escolherProfissional(id?: string) {
    setProfissionalId(id);
    setPasso("horario");
  }

  const podeConfirmar =
    nome.trim().length >= 2 && telefoneValido(whatsapp);

  async function confirmar() {
    setErro(null);
    setEnviando(true);
    try {
      await agendarPublico(slug, {
        servicoId: servicoId || undefined,
        profissionalId,
        data,
        hora,
        nome: nome.trim(),
        whatsapp: normalizarTelefone(whatsapp),
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

  // A barra só mostra os passos que este cliente realmente percorre.
  const ordemPassos: Passo[] = [
    ...(barbearia?.clienteEscolheServico === false
      ? []
      : (["servico"] as Passo[])),
    ...(barbearia?.clienteEscolheProfissional && profissionais.length > 0
      ? (["profissional"] as Passo[])
      : []),
    "horario",
    "dados",
  ];
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
              min={hojeNoFuso(barbearia?.fuso)}
              onChange={(e) => setData(e.target.value)}
              aria-label="Data"
            />
            {erroHorarios ? (
              <p className="pb-erro">
                Não foi possível carregar os horários. Tente de novo.
              </p>
            ) : horarios.length === 0 ? (
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
            <p className="pb-opcao__meta">
              {servico
                ? `${servico.nome} · ${data} às ${hora} · ${formatBRL(servico.precoCentavos)}`
                : `${data} às ${hora} · serviço e valor definidos na barbearia`}
            </p>
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
              type="tel"
              inputMode="tel"
              prefix={`${PAIS_PADRAO.flag} ${PAIS_PADRAO.ddi}`}
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="(11) 98765-4321"
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
                {servico ? `${servico.nome} · ` : ""}
                {data} às {hora}. A barbearia vai confirmar pelo WhatsApp.
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
