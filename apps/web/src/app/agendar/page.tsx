"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Avatar, Badge, Button, Input, Money } from "@/ds/components";
import { Icon } from "@/ds/icons";
import { datas, horarios, profissionais, servicos } from "@/lib/mock-data";
import { CONFIG_PADRAO, lerConfigSalva, resolverConfig, type ConfigAgendamento } from "@/lib/settings";

// "Qualquer" representa o primeiro disponível; os demais são a equipe real.
const PROFS = ["Qualquer", ...profissionais.map((p) => p.apelido)];

type Etapa = "servico" | "horario" | "confirma";

function Hero() {
  return (
    <div className="hero">
      <div className="hero__shop">
        <img src="/naregua/symbol-app-icon.svg" alt="" />
        <div>
          <div className="hero__name">Barbearia Régua</div>
          <div className="hero__meta">
            <span className="hero__row">
              <span style={{ color: "var(--brass-300)" }}><Icon name="star" size={13} /></span> <b>4,9</b> · 320 avaliações
            </span>
          </div>
        </div>
      </div>
      <div className="hero__meta" style={{ marginTop: 12 }}>
        <span className="hero__row"><Icon name="mapPin" size={13} /> Rua Augusta, 1200 · 800m</span>
        <Badge status="disponivel" size="sm">Aberto até 20h</Badge>
      </div>
    </div>
  );
}

function Nav({ title, passo, onBack }: { title: string; passo: string; onBack: () => void }) {
  return (
    <div className="nav">
      <button className="nav__back" onClick={onBack} aria-label="Voltar"><Icon name="chevronLeft" size={22} /></button>
      <span className="nav__title">{title}</span>
      <span className="nav__steps">{passo}</span>
    </div>
  );
}

function FluxoCliente() {
  const params = useSearchParams();
  // Querystring = pré-visualização explícita do dono; sem ela, vale a config salva.
  const temOverride = params.has("profissional") || params.has("servico");

  const [cfg, setCfg] = useState<ConfigAgendamento>(() =>
    temOverride
      ? resolverConfig({
          profissional: params.get("profissional") ?? undefined,
          servico: params.get("servico") ?? undefined,
        })
      : CONFIG_PADRAO,
  );

  useEffect(() => {
    if (!temOverride) setCfg(lerConfigSalva());
  }, [temOverride]);

  // As etapas existentes dependem da configuração da barbearia.
  const etapas = useMemo<Etapa[]>(() => {
    const lista: Etapa[] = [];
    if (cfg.clienteEscolheServico) lista.push("servico");
    lista.push("horario", "confirma");
    return lista;
  }, [cfg.clienteEscolheServico]);

  const [idx, setIdx] = useState(0);
  const [pronto, setPronto] = useState(false);
  const [svc, setSvc] = useState<string | null>(null);
  const [prof, setProf] = useState("Qualquer");
  const [date, setDate] = useState(datas[0].dd);
  const [slot, setSlot] = useState<string | null>(null);

  const etapa = etapas[idx];
  const servico = servicos.find((s) => s.id === svc) || null;
  const diaSel = datas.find((d) => d.dd === date);
  const profLabel = prof === "Qualquer" ? "Primeiro disponível" : prof;

  const avancar = () => (idx < etapas.length - 1 ? setIdx(idx + 1) : setPronto(true));
  const voltar = () => setIdx(Math.max(0, idx - 1));
  const reiniciar = () => {
    setIdx(0);
    setPronto(false);
    setSvc(null);
    setProf("Qualquer");
    setSlot(null);
  };

  if (pronto) {
    return (
      <div className="scr">
        <div className="okwrap">
          <div className="okcircle"><Icon name="check" size={44} /></div>
          <h1 className="okttl">Agendado!</h1>
          <p className="okline">Te esperamos {diaSel?.dw.toLowerCase()} ({date}) às {slot}. Confirmação enviada no WhatsApp.</p>
          <div className="ticket">
            <div className="ticket__ln"><span className="ticket__k">Serviço</span><span className="ticket__v">{servico?.nome ?? "A definir na barbearia"}</span></div>
            <div className="ticket__ln"><span className="ticket__k">Com</span><span className="ticket__v">{profLabel}</span></div>
            <div className="ticket__ln"><span className="ticket__k">Quando</span><span className="ticket__v" style={{ fontFamily: "var(--font-mono)" }}>{diaSel?.dw} {date} · {slot}</span></div>
            <div className="ticket__ln"><span className="ticket__k">Onde</span><span className="ticket__v">Rua Augusta, 1200</span></div>
          </div>
        </div>
        <div className="foot">
          <Button variant="primary" size="lg" fullWidth iconLeft={<Icon name="calendar" size={19} />}>Adicionar ao calendário</Button>
          <Button variant="ghost" fullWidth onClick={reiniciar}>Voltar ao início</Button>
        </div>
      </div>
    );
  }

  const passo = `${idx + 1}/${etapas.length}`;

  return (
    <div className="scr">
      {idx === 0 ? <Hero /> : <Nav title={etapa === "horario" ? "Horário" : "Confirmar"} passo={passo} onBack={voltar} />}

      <div className="body">
        {etapa === "servico" && (
          <>
            <div className="seclbl">Escolha o serviço</div>
            {servicos.map((s) => {
              const on = svc === s.id;
              return (
                <div key={s.id} className={on ? "opt opt--on" : "opt"} onClick={() => setSvc(s.id)}>
                  <div style={{ flex: 1 }}>
                    <div className="opt__nm">{s.nome}</div>
                    <div className="opt__du">{s.duracaoMin} min</div>
                  </div>
                  <Money value={s.preco} size="xs" symbol />
                  <span style={{ color: on ? "var(--green-text)" : "var(--border-default)" }}><Icon name="checkCircle" size={22} /></span>
                </div>
              );
            })}
          </>
        )}

        {etapa === "horario" && (
          <>
            {/* Seletor de profissional só aparece se a barbearia permitir. */}
            {cfg.clienteEscolheProfissional && (
              <>
                <div className="seclbl">Profissional</div>
                <div className="profrow">
                  {PROFS.map((nome, i) => {
                    const on = prof === nome;
                    return (
                      <button key={nome} className={on ? "profchip profchip--on" : "profchip"} onClick={() => setProf(nome)}>
                        <span className="profchip__ring">
                          {i === 0 ? <span className="anyav"><Icon name="users" size={20} /></span> : <Avatar name={nome} />}
                        </span>
                        <span className="profchip__cn">{nome}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            <div className="seclbl">Dia</div>
            <div className="dates">
              {datas.map((d) => (
                <div key={d.dd} className={date === d.dd ? "datepill datepill--on" : "datepill"} onClick={() => setDate(d.dd)}>
                  <div className="datepill__dw">{d.dw}</div>
                  <div className="datepill__dd">{d.dd}</div>
                </div>
              ))}
            </div>

            <div className="seclbl">Horários livres</div>
            <div className="slots">
              {horarios.map(([hora, disp]) => (
                <div
                  key={hora}
                  className={!disp ? "slot slot--off" : slot === hora ? "slot slot--on" : "slot"}
                  onClick={() => disp && setSlot(hora)}
                >
                  {hora}
                </div>
              ))}
            </div>
          </>
        )}

        {etapa === "confirma" && (
          <>
            <div className="summary">
              <div className="summary__ln"><span className="summary__k">Serviço</span><span className="summary__v">{servico?.nome ?? "A definir na barbearia"}</span></div>
              <div className="summary__ln"><span className="summary__k">Profissional</span><span className="summary__v">{profLabel}</span></div>
              <div className="summary__ln"><span className="summary__k">Quando</span><span className="summary__v" style={{ fontFamily: "var(--font-mono)" }}>{diaSel?.dw} {date} · {slot}</span></div>
              <div className="summary__ln">
                <span className="summary__k">Valor</span>
                <span className="summary__v">{servico ? <Money value={servico.preco} size="xs" /> : "A combinar"}</span>
              </div>
            </div>
            <div className="seclbl">Seus dados</div>
            <Input label="Nome" placeholder="Como te chamam?" />
            <Input label="WhatsApp" prefix={<Icon name="phone" size={15} />} placeholder="(11) 9 0000-0000" mono />
            <div style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", gap: 7, alignItems: "flex-start", padding: "2px" }}>
              <Icon name="message" size={15} /> Você recebe a confirmação e o lembrete no WhatsApp. Sem instalar nada.
            </div>
          </>
        )}
      </div>

      <div className="foot">
        {etapa === "confirma" ? (
          <div className="footbar">
            <div className="footbar__fl">
              <div className="footbar__fk">Total</div>
              {servico ? <Money value={servico.preco} size="md" /> : <span className="footbar__fk">A combinar no balcão</span>}
            </div>
            <Button variant="accent" size="lg" iconLeft={<Icon name="check" size={20} />} onClick={avancar}>Confirmar</Button>
          </div>
        ) : (
          <Button
            variant="primary"
            size="lg"
            fullWidth
            iconRight={<Icon name="arrowRight" size={20} />}
            disabled={etapa === "servico" ? !svc : !slot}
            onClick={avancar}
          >
            {etapa === "servico" ? "Escolher horário" : "Revisar agendamento"}
          </Button>
        )}
      </div>
    </div>
  );
}

export default function Agendar() {
  return (
    <div className="client">
      <div className="device">
        <Suspense fallback={null}>
          <FluxoCliente />
        </Suspense>
      </div>
    </div>
  );
}
