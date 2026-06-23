import type { Metadata } from "next";
import { Archivo, Bricolage_Grotesque, JetBrains_Mono } from "next/font/google";
// Ordem importa para a cascata: tokens e componentes do DS antes do globals.
import "../ds/tokens.css";
import "../ds/components.css";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

// As três famílias do design system. As variáveis casam com a ponte em tokens.css.
const archivo = Archivo({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--nr-archivo", display: "swap" });
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--nr-bricolage", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--nr-mono", display: "swap" });

export const metadata: Metadata = {
  title: "NaRégua — Gestão para barbearias",
  description: "Agendamento em tempo real e Pix dinâmico na cadeira.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${archivo.variable} ${bricolage.variable} ${jetbrains.variable}`}>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
