"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Protegido } from "@/components/protegido";
import { SairButton } from "@/components/sair-button";
import "./funcionario.css";

const TABS = [
  { href: "/funcionario/agenda", label: "Agenda" },
  { href: "/funcionario/comissoes", label: "Comissões" },
  { href: "/funcionario/repasses", label: "Repasses" },
];

export default function FuncionarioLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <Protegido papeis={["profissional"]}>
      <div className="fn-shell">
        <header className="fn-top">
          <span className="fn-brand">
            Na<b>Régua</b>
          </span>
          <SairButton />
        </header>

        <main className="fn-main">{children}</main>

        <nav className="fn-bottom" aria-label="Navegação">
          {TABS.map((t) => {
            const atual = pathname.startsWith(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                className={atual ? "fn-tab fn-tab--active" : "fn-tab"}
                aria-current={atual ? "page" : undefined}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </Protegido>
  );
}
