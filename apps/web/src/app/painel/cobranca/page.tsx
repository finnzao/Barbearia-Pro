"use client";

import { useMemo, useState } from "react";
import { Glyph } from "@/app/painel/glyphs";
import { Avatar, Badge, Btn, Card, Money, Modal, Row, Select } from "@/app/painel/ui";
import { profissionais, servicos } from "@/lib/mock-data";
import {
  CHAVE_CENTRAL,
  gerarCobrancaPix,
  gradeQr,
  MARCADOR_PROF,
  NOME_RECEBEDOR,
  pixEstaticoBalcao,
  type CobrancaPix,
} from "@/lib/pix";

type Estado = "form" | "aguardando" | "pago";

function Qr({ seed, label }: { seed: string; label: string }) {
  const grade = useMemo(() => gradeQr(seed), [seed]);
  return (
    <svg className="pn-qr" viewBox={`0 0 ${grade.length} ${grade.length}`} role="img" aria-label={label}>
      {grade.map((linha, y) =>
        linha.map((on, x) => (on ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} /> : null)),
      )}
    </svg>
  );
}

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
  const [profId, setProfId] = useState("");
  const [svcId, setSvcId] = useState("");
  const [estado, setEstado] = useState<Estado>("form");
  const [cobranca, setCobranca] = useState<CobrancaPix | null>(null);
  const [pixDe, setPixDe] = useState<{ id: string; nome: string } | null>(null);

  const prof = profissionais.find((p) => p.id === profId) || null;
  const servico = servicos.find((s) => s.id === svcId) || null;
  const valido = profId !== "" && svcId !== "";

  const gerar = () => {
    if (!servico || !prof) return;
    setCobranca(gerarCobrancaPix(servico.preco, MARCADOR_PROF[prof.id] ?? prof.id));
    setEstado("aguardando");
  };

  const reiniciar = () => {
    setProfId("");
    setSvcId("");
    setCobranca(null);
    setEstado("form");
  };

  return (
    <div className="pn-page">
      <div className="pn-pagehead">
        <h1 className="pn-h1">Gerar Pix</h1>
        <p className="pn-sub">Cobrança avulsa ou o Pix fixo de cada profissional — sempre na conta do salão, com split.</p>
      </div>

      {estado === "form" && (
        <Card title="Nova cobrança" style={{ maxWidth: 480 }}>
          <Select
            label="Profissional"
            placeholder="Quem vai atender"
            options={profissionais.map((p) => ({ value: p.id, label: p.nome }))}
            value={profId}
            onChange={(e) => setProfId(e.target.value)}
          />
          <Select
            label="Serviço"
            placeholder="Selecione o serviço"
            options={servicos.map((s) => ({ value: s.id, label: s.nome }))}
            value={svcId}
            onChange={(e) => setSvcId(e.target.value)}
          />
          {servico && (
            <div className="pn-rowline">
              <span className="pn-note">Valor da cobrança</span>
              <Money value={servico.preco} size="lg" />
            </div>
          )}
          <Btn variant="accent" size="lg" full disabled={!valido} iconLeft={<Glyph name="pix" size={18} />} onClick={gerar}>
            Gerar Pix
          </Btn>
        </Card>
      )}

      {estado !== "form" && cobranca && (
        <Card
          title="Cobrança gerada"
          action={<Badge tone={estado === "pago" ? "green" : "amber"}>{estado === "pago" ? "Pago" : "Aguardando"}</Badge>}
          style={{ maxWidth: 480 }}
        >
          <div className="pn-pix">
            <div className="pn-pix__resumo">
              <span className="pn-pix__name">{prof?.nome}</span>
              <span className="pn-pix__meta">{servico?.nome}</span>
              <Money value={servico?.preco ?? 0} size="lg" />
              <span className="pn-pix__meta">Recebe: {NOME_RECEBEDOR} · marcador {cobranca.marcadorProf}</span>
            </div>

            {estado === "aguardando" ? (
              <>
                <Qr seed={cobranca.copiaCola} label="QR Code do Pix" />
                <Copia codigo={cobranca.copiaCola} />
                <Btn variant="primary" full iconLeft={<Glyph name="check" size={18} />} onClick={() => setEstado("pago")}>
                  Marcar como pago
                </Btn>
              </>
            ) : (
              <div className="pn-ok">
                <span className="pn-ok__circle">
                  <Glyph name="check" size={36} />
                </span>
                <p className="pn-note">Entrada confirmada e dividida: comissão de {prof?.nome} realizada.</p>
                <Btn variant="ghost" full onClick={reiniciar}>
                  Nova cobrança
                </Btn>
              </div>
            )}
          </div>
        </Card>
      )}

      {estado === "form" && (
        <Card title="Pix fixo da equipe" action={<span className="pn-note">toque para ver o QR</span>} style={{ maxWidth: 560 }}>
          <p className="pn-note">
            QR fixo de balcão de cada profissional: a conta do salão com o marcador dele embutido. O cliente digita o valor e a
            entrada já cai identificada para o split.
          </p>
          <div className="pn-list">
            {profissionais.map((p) => (
              <Row
                key={p.id}
                leading={<Avatar name={p.nome} size="sm" />}
                title={p.nome}
                subtitle={`Conta do salão · marcador ${MARCADOR_PROF[p.id] ?? p.id}`}
                trailing={<Glyph name="pix" size={20} style={{ color: "var(--pn-accent-strong)" }} />}
                onClick={() => setPixDe({ id: p.id, nome: p.nome })}
              />
            ))}
          </div>
        </Card>
      )}

      <Modal open={!!pixDe} onClose={() => setPixDe(null)} title={pixDe ? `Pix fixo · ${pixDe.nome}` : ""}>
        {pixDe && (
          <div className="pn-pix">
            <div className="pn-pix__resumo">
              <span className="pn-pix__name">{pixDe.nome}</span>
              <span className="pn-pix__meta">{NOME_RECEBEDOR} · {CHAVE_CENTRAL}</span>
              <span className="pn-pix__meta">marcador {MARCADOR_PROF[pixDe.id] ?? pixDe.id}</span>
            </div>
            <Qr seed={pixEstaticoBalcao(MARCADOR_PROF[pixDe.id] ?? pixDe.id)} label="QR do Pix fixo" />
            <Copia codigo={pixEstaticoBalcao(MARCADOR_PROF[pixDe.id] ?? pixDe.id)} />
          </div>
        )}
      </Modal>
    </div>
  );
}
