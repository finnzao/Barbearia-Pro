"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import type { Papel } from "@/lib/auth-api";
import { useAuth } from "@/lib/auth-context";

function destinoPorPapel(papel: Papel): string {
  return papel === "profissional" ? "/funcionario" : "/painel";
}

export function Protegido({
  papeis,
  children,
}: {
  papeis: Papel[];
  children: ReactNode;
}) {
  const { status, usuario } = useAuth();
  const router = useRouter();

  const permitido = !!usuario && papeis.includes(usuario.papel);

  useEffect(() => {
    if (status === "deslogado") {
      router.replace("/login");
    } else if (status === "autenticado" && usuario && !permitido) {
      router.replace(destinoPorPapel(usuario.papel));
    }
  }, [status, usuario, permitido, router]);

  if (status !== "autenticado" || !permitido) {
    return (
      <div className="auth-carregando" role="status" aria-live="polite">
        Carregando…
      </div>
    );
  }

  return <>{children}</>;
}
