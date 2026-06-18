"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Glyph } from "@/app/painel/glyphs";
import { ATALHOS, SERVICOS } from "@/app/painel/secoes";
import { resumoHoje } from "@/lib/mock-data";
import { lerRepasse, pendenciasRepasse } from "@/lib/repasse";

const CHAVE_FAV = "naregua:favoritos";
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Home() {
  const [favoritos, setFavoritos] = useState<string[]>([]);
  const [aRepassar, setARepassar] = useState(0);

  useEffect(() => {
    try {
      const cru = window.localStorage.getItem(CHAVE_FAV);
      if (cru) setFavoritos(JSON.parse(cru));
    } catch {
      setFavoritos([]);
    }
    const modo = lerRepasse().modo;
    setARepassar(pendenciasRepasse(modo).reduce((s, p) => (p.liquido > 0 ? s + p.liquido : s), 0));
  }, []);

  const alternarFavorito = (key: string) => {
    setFavoritos((atual) => {
      const proximo = atual.includes(key) ? atual.filter((k) => k !== key) : [...atual, key];
      try {
        window.localStorage.setItem(CHAVE_FAV, JSON.stringify(proximo));
      } catch {}
      return proximo;
    });
  };

  const r = resumoHoje();
  const fixados = SERVICOS.filter((s) => favoritos.includes(s.key));

  return (
    <div className="pn-home">
      <section className="pn-welcome" aria-labelledby="pn-welcome-h">
        <span className="pn-eyebrow">Painel</span>
        <h1 id="pn-welcome-h" className="pn-welcome__title">Bem-vindo de volta</h1>
        <p className="pn-welcome__date">{r.data}</p>
        <div className="pn-stats">
          <div className="pn-statcard">
            <span className="pn-statcard__lbl">Faturamento hoje</span>
            <span className="pn-statcard__num">{brl(r.faturamento)}</span>
          </div>
          <div className="pn-statcard">
            <span className="pn-statcard__lbl">Na fila</span>
            <span className="pn-statcard__num">{r.proximos.length}</span>
          </div>
          <div className="pn-statcard">
            <span className="pn-statcard__lbl">A repassar</span>
            <span className="pn-statcard__num">{brl(aRepassar)}</span>
          </div>
        </div>
      </section>

      <section className="pn-block" aria-labelledby="pn-quick-h">
        <h2 id="pn-quick-h" className="pn-h2">Atalhos rápidos</h2>
        <div className="pn-quick">
          {ATALHOS.map((a) => (
            <Link key={a.label} href={a.href} className="pn-chip">
              <Glyph name={a.icon} size={20} />
              <span>{a.label}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="pn-block" aria-labelledby="pn-svc-h">
        <h2 id="pn-svc-h" className="pn-h2">Serviços</h2>
        <div className="pn-grid">
          {SERVICOS.map((s) => {
            const fav = favoritos.includes(s.key);
            return (
              <div key={s.key} className="pn-svc-wrap">
                <Link href={s.href} className={s.destaque ? "pn-svc pn-svc--destaque" : "pn-svc"}>
                  <span className="pn-svc__icon">
                    <Glyph name={s.icon} size={24} />
                  </span>
                  <span className="pn-svc__title">{s.label}</span>
                  <span className="pn-svc__desc">{s.resumo}</span>
                  <span className="pn-svc__action">
                    {s.acao}
                    <Glyph name="seta" size={16} />
                  </span>
                </Link>
                <button
                  type="button"
                  className={fav ? "pn-fav pn-fav--on" : "pn-fav"}
                  aria-pressed={fav}
                  aria-label={fav ? `Remover ${s.label} dos favoritos` : `Fixar ${s.label} nos favoritos`}
                  onClick={() => alternarFavorito(s.key)}
                >
                  <Glyph name={fav ? "estrelaCheia" : "estrela"} size={20} />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="pn-block" aria-labelledby="pn-fav-h">
        <h2 id="pn-fav-h" className="pn-h2">Favoritos</h2>
        {fixados.length > 0 ? (
          <div className="pn-favlist">
            {fixados.map((s) => (
              <Link key={s.key} href={s.href} className="pn-favitem">
                <span className="pn-favitem__icon">
                  <Glyph name={s.icon} size={20} />
                </span>
                <span className="pn-favitem__label">{s.label}</span>
                <Glyph name="seta" size={16} style={{ marginLeft: "auto", opacity: 0.6 }} />
              </Link>
            ))}
          </div>
        ) : (
          <p className="pn-empty">Toque na estrela de um serviço para fixá-lo aqui e abrir em um toque.</p>
        )}
      </section>

      <footer className="pn-foot">
        <Link href="/painel" className="pn-foot__brand">Na<b>Régua</b></Link>
        <nav className="pn-foot__links" aria-label="Rodapé">
          <Link href="/painel/relatorios">Relatórios</Link>
          <Link href="/painel/configuracoes">Configurações</Link>
        </nav>
        <span className="pn-foot__note">Gestão e pagamentos do salão, na régua.</span>
      </footer>
    </div>
  );
}
