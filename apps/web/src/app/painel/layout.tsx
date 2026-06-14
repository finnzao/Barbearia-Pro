import { Sidebar } from "@/components/sidebar";
import "./painel.css";

export default function PainelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell">
      <Sidebar />
      <main className="content">{children}</main>
    </div>
  );
}
