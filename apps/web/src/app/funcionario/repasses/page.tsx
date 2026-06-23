"use client";

import { useEffect, useState } from "react";
import type { RepassesFuncionario } from "@/lib/auth-api";
import { useAuth } from "@/lib/auth-context";
import { formatBRL } from "@/lib/money";

function periodo(inicio: string, fim: string): string {
  const f = (iso: string) =>
    new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });
  return `${f(inicio)} – ${f(fim)}`;
}

export default function RepassesPage() {
  const { requisitar } = useAuth();
  const [dados, setDados] = useState<RepassesFuncionario | null>(null);
  const [estado, setEstado] = useState<"carregando" | "ok" | "erro">(
    "carregando",
  );

  useEffect(() => {
    let ativo = true;
    requisitar<RepassesFuncionario>("/funcionario/repasses")
      .then((r) => {
        if (ativo) {
          setDados(r);
          setEstado("ok");
        }
      })
      .catch(() => {
        if (ativo) setEstado("erro");
      });
    return () => {
      ativo = false;
    };
  }, [requisitar]);

  return (
    <>
      <h1 className="fn-titulo">Meus repasses</h1>

      {estado === "carregando" && <p className="fn-vazio">Carregando…</p>}
      {estado === "erro" && (
        <p className="fn-vazio">Não foi possível carregar os repasses.</p>
      )}

      {estado === "ok" && dados && (
        <>
          <div className="fn-resumo">
            <div className="fn-card fn-card--destaque">
              <span className="fn-card__lbl">Pendente</span>
              <span className="fn-card__num">
                {formatBRL(dados.pendenteCentavos)}
              </span>
            </div>
            <div className="fn-card">
              <span className="fn-card__lbl">Já recebido</span>
              <span className="fn-card__num">
                {formatBRL(dados.pagoCentavos)}
              </span>
            </div>
          </div>

          {dados.repasses.length === 0 ? (
            <p className="fn-vazio">Nenhum repasse registrado.</p>
          ) : (
            <div className="fn-lista">
              {dados.repasses.map((r) => (
                <div key={r.id} className="fn-item">
                  <div className="fn-item__corpo">
                    <div className="fn-item__cliente">
                      {periodo(r.periodoInicio, r.periodoFim)}
                    </div>
                    <div className="fn-item__status">{r.status}</div>
                  </div>
                  <span className="fn-item__valor">
                    {formatBRL(r.valorCentavos)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
