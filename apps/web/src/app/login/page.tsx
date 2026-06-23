"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button, Input } from "@/ds/components";
import { ApiError, type Papel } from "@/lib/auth-api";
import { useAuth } from "@/lib/auth-context";
import "./login.css";

function destinoPorPapel(papel: Papel): string {
  return papel === "profissional" ? "/funcionario" : "/painel";
}

export default function LoginPage() {
  const { entrar, status, usuario } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (status === "autenticado" && usuario) {
      router.replace(destinoPorPapel(usuario.papel));
    }
  }, [status, usuario, router]);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const autenticado = await entrar(email.trim(), senha);
      router.replace(destinoPorPapel(autenticado.papel));
    } catch (e) {
      setErro(
        e instanceof ApiError
          ? e.message
          : "Não foi possível entrar. Tente novamente.",
      );
      setEnviando(false);
    }
  }

  return (
    <div className="login-tela">
      <div className="login-cartao">
        <div className="login-cabecalho">
          <span className="login-marca">
            <svg
              className="login-marca__mark"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M3 14.5 14 3.5a2 2 0 0 1 2.8 0l1.7 1.7a2 2 0 0 1 0 2.8L7.5 19"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M7.5 19H4a1 1 0 0 1-1-1v-3.5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Na<b>Régua</b>
          </span>

          <span className="login-eyebrow">Acesso ao painel</span>
          <h1 className="login-titulo">Bem-vindo de volta</h1>
          <p className="login-sub">
            Entre com seu e-mail e senha para gerenciar sua barbearia.
          </p>
        </div>

        <form className="login-form" onSubmit={aoEnviar}>
          {erro && (
            <div className="login-erro" role="alert">
              {erro}
            </div>
          )}

          <Input
            label="E-mail"
            type="email"
            placeholder="voce@suabarbearia.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Senha"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />

          <Button type="submit" size="lg" fullWidth loading={enviando}>
            Entrar
          </Button>
        </form>

        <p className="login-rodape">
          Problemas para acessar? Fale com o dono da barbearia.
        </p>
      </div>
    </div>
  );
}
