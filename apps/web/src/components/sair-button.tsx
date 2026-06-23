"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export function SairButton({ className }: { className?: string }) {
  const { sair } = useAuth();
  const router = useRouter();

  async function aoSair() {
    await sair();
    router.replace("/login");
  }

  return (
    <button
      type="button"
      className={className}
      onClick={aoSair}
      style={{
        background: "transparent",
        border: "1px solid currentColor",
        color: "inherit",
        borderRadius: 999,
        padding: "6px 12px",
        font: "inherit",
        fontSize: 13,
        cursor: "pointer",
        opacity: 0.85,
      }}
    >
      Sair
    </button>
  );
}
