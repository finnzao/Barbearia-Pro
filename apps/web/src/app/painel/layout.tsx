"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Glyph } from "@/app/painel/glyphs";
import { NAV } from "@/app/painel/secoes";
import "@/app/painel/painel.css";

function ehAtiva(pathname: string, href: string) {
  return href === "/painel" ? pathname === "/painel" : pathname.startsWith(href);
}

export default function PainelLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="pn-shell">
      <header className="pn-top">
        <Link href="/painel" className="pn-brand" aria-label="NaRégua, início">
          <svg className="pn-brand__mark" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M3 14.5 14 3.5a2 2 0 0 1 2.8 0l1.7 1.7a2 2 0 0 1 0 2.8L7.5 19" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M7.5 19H4a1 1 0 0 1-1-1v-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="pn-brand__name">Na<b>Régua</b></span>
        </Link>

        <nav className="pn-nav" aria-label="Navegação principal">
          {NAV.filter((s) => !s.destaque).map((s) => {
            const atual = ehAtiva(pathname, s.href);
            return (
              <Link
                key={s.href}
                href={s.href}
                className={atual ? "pn-link pn-link--active" : "pn-link"}
                aria-current={atual ? "page" : undefined}
              >
                <Glyph name={s.icon} size={18} />
                {s.label}
              </Link>
            );
          })}
        </nav>

        <Link href="/painel/cobranca" className="pn-cta">
          <Glyph name="pix" size={18} />
          <span>Gerar Pix</span>
        </Link>
      </header>

      <main className="pn-main">{children}</main>

      <nav className="pn-bottom" aria-label="Navegação">
        {NAV.map((s) => {
          const atual = ehAtiva(pathname, s.href);
          const classe = [
            "pn-tab",
            s.destaque ? "pn-tab--cta" : "",
            atual ? "pn-tab--active" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <Link key={s.href} href={s.href} className={classe} aria-current={atual ? "page" : undefined}>
              <Glyph name={s.icon} size={22} />
              <span>{s.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
