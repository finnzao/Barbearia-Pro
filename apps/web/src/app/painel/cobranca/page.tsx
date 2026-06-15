"use client";

import { useMemo, useState } from "react";
import { Badge, Button, Card, Money, Select } from "@/ds/components";
import { Icon } from "@/ds/icons";
import { profissionais, servicos } from "@/lib/mock-data";
import { CHAVES_PIX, gerarCobrancaPix, gradeQr, type CobrancaPix } from "@/lib/pix";

type Estado = "form" | "aguardando" | "pago";

export default function Cobranca() {
  const [profId, setProfId] = useState("");
  const [svcId, setSvcId] = useState("");
  const [estado, setEstado] = useState<Estado>("form");
  const [cobranca, setCobranca] = useState<CobrancaPix | null>(null);
  const [copiado, setCopiado] = useState(false);

  const prof = profissionais.find((p) => p.id === profId) || null;
  const servico = servicos.find((s) => s.id === svcId) || null;
  const valido = profId !== "" && svcId !== "";

  const grade = useMemo(() => (cobranca ? gradeQr(cobranca.copiaCola) : []), [cobranca]);

  const gerar = () => {
    if (!servico || !prof) return;
    setCobranca(gerarCobrancaPix(servico.preco * 100, CHAVES_PIX[prof.id] ?? ""));
    setEstado("aguardando");
    setCopiado(false);
  };

  const copiar = async () => {
    if (!cobranca) return;
    await navigator.clipboard.writeText(cobranca.copiaCola);
    setCopiado(true);
  };

  const reiniciar = () => {
    setProfId("");
    setSvcId("");
    setCobranca(null);
    setEstado("form");
  };

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1 className="page-title">Gerar Pix</h1>
          <p className="page-sub">Cobrança dinâmica vinculada ao profissional</p>
        </div>
      </div>

      {estado === "form" && (
        <Card title="Nova cobrança" style={{ maxWidth: 460 }}>
          <div className="stack-sm">
            <Select
              label="Profissional"
              required
              placeholder="Quem vai atender"
              options={profissionais.map((p) => ({ value: p.id, label: p.nome }))}
              value={profId}
              onChange={(e) => setProfId(e.target.value)}
            />
            <Select
              label="Serviço"
              required
              placeholder="Selecione o serviço"
              options={servicos.map((s) => ({ value: s.id, label: s.nome }))}
              value={svcId}
              onChange={(e) => setSvcId(e.target.value)}
            />
            {servico && (
              <div className="row-between cobranca__valor">
                <span className="muted">Valor</span>
                <Money value={servico.preco} size="md" />
              </div>
            )}
            <Button
              variant="accent"
              size="lg"
              fullWidth
              disabled={!valido}
              iconLeft={<Icon name="qr" size={18} />}
              onClick={gerar}
            >
              Gerar Pix
            </Button>
          </div>
        </Card>
      )}

      {estado !== "form" && cobranca && (
        <Card
          title="Cobrança gerada"
          action={
            <Badge status={estado === "pago" ? "concluido" : "pendente"} size="sm">
              {estado === "pago" ? "Pago" : "Aguardando"}
            </Badge>
          }
          style={{ maxWidth: 460 }}
        >
          <div className="cobranca">
            <div className="cobranca__resumo">
              <span>{prof?.nome}</span>
              <span className="muted">{servico?.nome}</span>
              <Money value={servico?.preco ?? 0} size="lg" />
            </div>

            {estado === "aguardando" ? (
              <>
                <svg
                  className="cobranca__qr"
                  viewBox={`0 0 ${grade.length} ${grade.length}`}
                  role="img"
                  aria-label="QR Code do Pix"
                >
                  {grade.map((linha, y) =>
                    linha.map((on, x) =>
                      on ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} /> : null,
                    ),
                  )}
                </svg>

                <button className="cobranca__cc" onClick={copiar}>
                  <span className="cobranca__cc-code">{cobranca.copiaCola}</span>
                  <span className="cobranca__cc-act">
                    <Icon name={copiado ? "check" : "copy"} size={16} /> {copiado ? "Copiado" : "Copiar"}
                  </span>
                </button>

                <Button variant="primary" fullWidth iconLeft={<Icon name="check" size={18} />} onClick={() => setEstado("pago")}>
                  Marcar como pago
                </Button>
              </>
            ) : (
              <div className="cobranca__ok">
                <div className="cobranca__okcircle">
                  <Icon name="check" size={40} />
                </div>
                <p className="muted">Comissão de {prof?.nome} lançada.</p>
                <Button variant="ghost" fullWidth onClick={reiniciar}>
                  Nova cobrança
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
