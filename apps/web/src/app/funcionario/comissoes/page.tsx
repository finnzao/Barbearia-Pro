"use client";

import { useEffect, useState } from "react";
import type { ComissoesFuncionario } from "@/lib/auth-api";
import { useAuth } from "@/lib/auth-context";
import { formatBRL } from "@/lib/money";

export default function ComissoesPage() {
  const { requisitar } = useAuth();
  const [dados, setDados] = useState<ComissoesFuncionario | null>(null);
  const [estado, setEstado] = useState<"carregando" | "ok" | "erro">(
    "carregando",
  );

  useEffect(() => {
    let ativo = true;
    requisitar<ComissoesFuncionario>("/funcionario/comissoes")
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
      <h1 className="fn-titulo">Minhas comissões</h1>

      {estado === "carregando" && <p className="fn-vazio">Carregando…</p>}
      {estado === "erro" && (
        <p className="fn-vazio">Não foi possível carregar as comissões.</p>
      )}

      {estado === "ok" && dados && (
        <div className="fn-resumo">
          <div className="fn-card fn-card--destaque">
            <span className="fn-card__lbl">A receber</span>
            <span className="fn-card__num">
              {formatBRL(dados.aReceberCentavos)}
            </span>
          </div>
          <div className="fn-card">
            <span className="fn-card__lbl">Faturado</span>
            <span className="fn-card__num">
              {formatBRL(dados.faturadoCentavos)}
            </span>
          </div>
          <div className="fn-card">
            <span className="fn-card__lbl">Comissão total</span>
            <span className="fn-card__num">
              {formatBRL(dados.comissaoCentavos)}
            </span>
          </div>
        </div>
      )}
    </>
  );
}
