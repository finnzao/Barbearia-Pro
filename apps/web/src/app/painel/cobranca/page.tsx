"use client";

import { useEffect, useState } from "react";
import { Glyph } from "@/app/painel/glyphs";
import { Badge, Btn, Card, Money, Select } from "@/app/painel/ui";
import { MercadoPagoCard } from "@/app/painel/mercadopago-card";
import {
  criarPagamento,
  getPagamento,
  getProfissionais,
  getServicos,
  type PagamentoLista,
} from "@/lib/api";
import type { Profissional, Servico } from "@/lib/types";

function Copia({ codigo }: { codigo: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <button
      type="button"
      className="pn-copia"
      onClick={async () => {
        await navigator.clipboard.writeText(codigo);
        setCopiado(true);
      }}
    >
      <span className="pn-copia__code">{codigo}</span>
      <span className="pn-copia__act">
        <Glyph name={copiado ? "check" : "copy"} size={16} />
        {copiado ? "Copiado" : "Copiar"}
      </span>
    </button>
  );
}

export default function Cobranca() {
  const [profs, setProfs] = useState<Profissional[]>([]);
  const [servs, setServs] = useState<Servico[]>([]);
  const [profId, setProfId] = useState("");
  const [svcId, setSvcId] = useState("");
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [cobranca, setCobranca] = useState<PagamentoLista | null>(null);

  useEffect(() => {
    Promise.all([getProfissionais(), getServicos()])
      .then(([ps, ss]) => {
        setProfs(ps);
        setServs(ss);
      })
      .catch(() => {});
  }, []);

  // A confirmação real vem do webhook do Mercado Pago; aqui só consultamos o
  // status de tempos em tempos até virar "pago".
  const aguardando = cobranca !== null && cobranca.status !== "pago";
  useEffect(() => {
    if (!aguardando || !cobranca) return;
    const timer = setInterval(() => {
      getPagamento(cobranca.id)
        .then((atual) =>
          setCobranca((c) => (c && c.id === atual.id ? { ...atual, qrCodeBase64: c.qrCodeBase64 } : c)),
        )
        .catch(() => {});
    }, 4000);
    return () => clearInterval(timer);
  }, [aguardando, cobranca]);

  const prof = profs.find((p) => p.id === profId) || null;
  const servico = servs.find((s) => s.id === svcId) || null;
  const valido = prof !== null && servico !== null;

  const gerar = async () => {
    if (!servico || !prof) return;
    setGerando(true);
    setErro(null);
    try {
      const criado = await criarPagamento({
        profissionalId: prof.id,
        valorCentavos: servico.preco,
        metodo: "pix_dinamico",
        servicoNome: servico.nome,
        servicoId: servico.id,
      });
      setCobranca(criado);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível gerar a cobrança.");
    } finally {
      setGerando(false);
    }
  };

  const reiniciar = () => {
    setProfId("");
    setSvcId("");
    setCobranca(null);
    setErro(null);
  };

  return (
    <div className="pn-page">
      <div className="pn-pagehead">
        <h1 className="pn-h1">Gerar Pix</h1>
        <p className="pn-sub">
          Cobrança Pix real na conta Mercado Pago da barbearia, com o marcador do profissional para o split.
        </p>
      </div>

      <MercadoPagoCard />

      {!cobranca && (
        <Card title="Nova cobrança" style={{ maxWidth: 480 }}>
          <Select
            label="Profissional"
            placeholder="Quem vai atender"
            options={profs.map((p) => ({ value: p.id, label: p.nome }))}
            value={profId}
            onChange={(e) => setProfId(e.target.value)}
          />
          <Select
            label="Serviço"
            placeholder="Selecione o serviço"
            options={servs.map((s) => ({ value: s.id, label: s.nome }))}
            value={svcId}
            onChange={(e) => setSvcId(e.target.value)}
          />
          {servico && (
            <div className="pn-rowline">
              <span className="pn-note">Valor da cobrança</span>
              <Money value={servico.preco} size="lg" />
            </div>
          )}
          {erro && <p className="pn-note">{erro}</p>}
          <Btn
            variant="accent"
            size="lg"
            full
            disabled={!valido || gerando}
            iconLeft={<Glyph name="pix" size={18} />}
            onClick={gerar}
          >
            {gerando ? "Gerando..." : "Gerar Pix"}
          </Btn>
        </Card>
      )}

      {cobranca && (
        <Card
          title="Cobrança gerada"
          action={
            <Badge tone={cobranca.status === "pago" ? "green" : "amber"}>
              {cobranca.status === "pago" ? "Pago" : "Aguardando"}
            </Badge>
          }
          style={{ maxWidth: 480 }}
        >
          <div className="pn-pix">
            <div className="pn-pix__resumo">
              <span className="pn-pix__name">{prof?.nome}</span>
              <span className="pn-pix__meta">{cobranca.servicoNome}</span>
              <Money value={cobranca.valorCentavos} size="lg" />
            </div>

            {cobranca.status !== "pago" ? (
              <>
                {cobranca.qrCodeBase64 && (
                  /* eslint-disable-next-line @next/next/no-img-element -- QR em data URI, next/image não otimiza */
                  <img
                    className="pn-qr"
                    src={`data:image/png;base64,${cobranca.qrCodeBase64}`}
                    alt="QR Code do Pix"
                  />
                )}
                {cobranca.copiaCola && <Copia codigo={cobranca.copiaCola} />}
                <p className="pn-note">
                  Confirma sozinho assim que o cliente pagar — pode deixar a tela aberta.
                </p>
              </>
            ) : (
              <div className="pn-ok">
                <span className="pn-ok__circle">
                  <Glyph name="check" size={36} />
                </span>
                <p className="pn-note">Pagamento confirmado pelo Mercado Pago.</p>
              </div>
            )}
            <Btn variant="ghost" full onClick={reiniciar}>
              Nova cobrança
            </Btn>
          </div>
        </Card>
      )}
    </div>
  );
}
