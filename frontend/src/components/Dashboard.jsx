/**
 * Dashboard.jsx — Painel principal do usuário
 *
 * Organizado em uma grade de cartões (2 colunas no desktop, 1 no mobile):
 * - Progresso na Trilha: medidor em arco + andamento por módulo
 * - Ranking: os primeiros colocados e a posição do usuário
 * - Detalhes: aulas, simulações e conquistas (badges)
 * - Últimas Simulações
 *
 * O título da página e os indicadores de XP/saldo ficam no cabeçalho do App.
 *
 * Paleta de cores:
 * - primary: progresso e elementos de aprendizado
 * - accent:  XP, conquistas e gamificação
 */

import { Trophy, BookOpen, Calculator, TrendingUp, ArrowRight, Award, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { api } from "../api";
import { Card, IconButton, Avatar, EmptyState } from "./ui";

// Cores dos módulos na legenda do medidor (seguem a paleta ativa)
const CORES_MODULO = ["var(--color-primary)", "var(--color-accent)", "#10b981", "#94a3b8"];

// Comprimento do arco do medidor (semicírculo de raio 80)
const ARCO = Math.PI * 80;

export default function Dashboard({ user, onTabChange }) {
  const [lessons, setLessons] = useState([]);
  const [progress, setProgress] = useState([]);
  const [medals, setMedals] = useState([]);
  const [simulations, setSimulations] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);

  // Carrega todos os dados do painel em paralelo
  useEffect(() => {
    async function carregarDados() {
      try {
        const [licoes, progressos, medalhas, sims, rank] = await Promise.all([
          api.get("/api/licoes"),
          api.get(`/api/licoes/usuario/${user.id}/progresso`),
          api.get(`/api/perfis/${user.id}/medalhas`),
          api.get(`/api/simulacoes/usuario/${user.id}`),
          api.get("/api/perfis/ranking"),
        ]);
        setLessons(licoes);
        setProgress(progressos);
        setMedals(medalhas);
        setSimulations(sims);
        setRanking(rank);
      } catch (err) {
        console.error("Erro ao carregar dados do painel:", err);
      } finally {
        setLoading(false);
      }
    }
    carregarDados();
  }, [user.id]);

  // Calcula o percentual de progresso na trilha
  const totalLessons = lessons.length;
  const concluidas = new Set(progress.filter((p) => p.concluido).map((p) => p.licaoId));
  const completedLessons = lessons.filter((l) => concluidas.has(l.id)).length;
  const progressPercent = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;

  // Andamento por módulo, na ordem em que os módulos aparecem na trilha
  const modulos = [];
  for (const licao of lessons) {
    let modulo = modulos.find((m) => m.nome === licao.modulo);
    if (!modulo) {
      modulo = { nome: licao.modulo, total: 0, feitas: 0 };
      modulos.push(modulo);
    }
    modulo.total += 1;
    if (concluidas.has(licao.id)) modulo.feitas += 1;
  }

  // Posição do usuário no ranking geral (por XP)
  const minhaPosicao = ranking.findIndex((p) => p.id === user.id) + 1;

  // Mapeamento de tipos de medalha para label e emoji
  const badgeLabels = {
    first_lesson: { label: "Primeira Aula", icon: "🎓" },
    first_simulation: { label: "Primeira Simulação", icon: "📊" },
    module_complete: { label: "Módulo Completo", icon: "🏆" },
    "Primeira Aula": { label: "Primeira Aula", icon: "🎓" },
    "Simulador Pro": { label: "Primeiro Simulador", icon: "📊" },
  };

  if (loading) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="text-slate-400 font-medium animate-pulse">Carregando painel...</div>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-8 pt-2 pb-8 grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-in">

      {/* ── Progresso na Trilha: medidor + módulos ── */}
      <Card
        title="Progresso na Trilha"
        actions={<IconButton icon={ArrowRight} label="Abrir a Trilha de Aprendizado" onClick={() => onTabChange("trilha")} />}
        data-finbot-context={`Progresso na Trilha de Aprendizado: ${progressPercent}% completo (${completedLessons} de ${totalLessons} aulas). Complete todas as aulas para dominar educação financeira!`}
      >
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Medidor em arco: trilha cinza + preenchimento proporcional ao progresso */}
          <div className="relative w-52 shrink-0">
            <svg viewBox="0 0 200 112" className="w-full">
              <defs>
                <linearGradient id="arco-progresso" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" style={{ stopColor: "var(--color-primary)" }} />
                  <stop offset="100%" style={{ stopColor: "var(--color-accent)" }} />
                </linearGradient>
              </defs>
              <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" strokeWidth="10" strokeLinecap="round"
                style={{ stroke: "var(--color-border)" }} />
              {progressPercent > 0 && (
                <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" strokeWidth="10" strokeLinecap="round"
                  stroke="url(#arco-progresso)"
                  strokeDasharray={`${(progressPercent / 100) * ARCO} ${ARCO}`}
                  className="transition-all duration-700" />
              )}
            </svg>
            <div className="absolute inset-x-0 bottom-0 text-center">
              <p className="text-3xl font-black text-slate-800 leading-none">{progressPercent}%</p>
              <p className="text-xs font-semibold text-slate-400 mt-1">
                {completedLessons} de {totalLessons} aulas
              </p>
            </div>
          </div>

          {/* Legenda: um módulo por linha, com linha pontilhada até o valor */}
          <div className="flex-1 w-full space-y-3">
            {modulos.length === 0 ? (
              <p className="text-sm text-slate-400 italic">Nenhuma aula cadastrada ainda.</p>
            ) : (
              modulos.map((m, i) => (
                <div key={m.nome} className="flex items-center gap-2.5 text-sm">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: m.feitas > 0 ? CORES_MODULO[i % CORES_MODULO.length] : "#cbd5e1" }} />
                  <span className="font-semibold text-slate-700 capitalize truncate">{m.nome}</span>
                  <span className="flex-1 border-b border-dashed border-slate-200 min-w-4" />
                  <span className={`font-extrabold ${m.feitas > 0 ? "text-slate-800" : "text-slate-400"}`}>
                    {m.feitas}/{m.total}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Botão principal: usa var(--color-primary) e var(--color-text-on-primary) */}
        <button
          onClick={() => onTabChange("trilha")}
          className="mt-6 w-full font-bold py-3 px-4 rounded-sm shadow-md transition-all duration-150 flex items-center justify-center gap-2 text-sm hover:opacity-90"
          style={{ background: "var(--color-primary)", color: "var(--color-text-on-primary)" }}
          data-finbot-context="Botão 'Continuar Aprendendo': leva você à Trilha de Aprendizado, onde há aulas curtas sobre finanças no estilo Duolingo. Complete aulas para ganhar XP e subir de nível!"
        >
          <BookOpen className="w-4 h-4" />
          Continuar Aprendendo
        </button>
      </Card>

      {/* ── Ranking: primeiros colocados + posição do usuário ── */}
      <Card
        title="Ranking"
        actions={<IconButton icon={ArrowRight} label="Abrir o Ranking" onClick={() => onTabChange("ranking")} />}
        data-finbot-context="Prévia do Ranking: mostra os usuários com mais XP na plataforma e a sua posição entre eles."
      >
        {ranking.length === 0 ? (
          <EmptyState icon={Trophy} title="Ranking indisponível" text="Não foi possível carregar a classificação agora." />
        ) : (
          <div className="flex flex-col sm:flex-row gap-5 h-full">
            {/* Destaque escuro com a posição do usuário */}
            <div className="rounded-sm p-5 flex flex-col justify-center sm:w-44 shrink-0 text-white"
              style={{ background: "var(--color-primary-dark)" }}>
              <p className="text-4xl font-black leading-none" style={{ color: "var(--color-accent)" }}>
                {minhaPosicao > 0 ? `${minhaPosicao}º` : "—"}
              </p>
              <p className="text-sm font-bold mt-2">Sua posição</p>
              <p className="text-xs text-white/60 font-medium mt-0.5">
                entre {ranking.length} {ranking.length === 1 ? "usuário" : "usuários"}
              </p>
            </div>

            <div className="flex-1 min-w-0">
              {ranking.slice(0, 4).map((p, i) => (
                <div key={p.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0 border-b border-slate-100 last:border-0">
                  <span className="w-6 text-sm font-black text-slate-400 shrink-0">{i + 1}º</span>
                  <Avatar nome={p.nome} avatarUrl={p.avatarUrl} className="w-8 h-8 text-xs" />
                  <span className={`flex-1 truncate text-sm ${p.id === user.id ? "font-extrabold text-slate-800" : "font-semibold text-slate-700"}`}>
                    {p.nome}{p.id === user.id && " (você)"}
                  </span>
                  <span className="text-sm font-black text-slate-800 shrink-0">{p.xp} XP</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* ── Detalhes: números grandes + conquistas ── */}
      <Card title="Detalhes">
        <div className="grid grid-cols-3 gap-4">
          <div data-finbot-context={`Aulas concluídas: ${completedLessons} de ${totalLessons}.`}>
            <p className="text-2xl font-black text-slate-800">{completedLessons}<span className="text-slate-400 text-lg">/{totalLessons}</span></p>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">Aulas concluídas</p>
          </div>
          <div data-finbot-context={`Simulações realizadas: ${simulations.length}. Cada simulação projeta o crescimento de um investimento com juros compostos.`}>
            <p className="text-2xl font-black text-slate-800">{simulations.length}</p>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">Simulações</p>
          </div>
          <div data-finbot-context={`Badges (insígnias) conquistados: ${medals.length} badges. Badges são prêmios virtuais que você ganha ao atingir marcos na plataforma, como concluir sua primeira aula ou fazer sua primeira simulação.`}>
            <p className="text-2xl font-black text-slate-800">{medals.length}</p>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">Badges</p>
          </div>
        </div>

        {/* Barra de XP para o próximo nível */}
        <div className="mt-6" data-finbot-context="Nível do usuário na plataforma EduFinance. O nível sobe a cada 100 pontos de XP conquistados.">
          <div className="flex justify-between text-xs font-bold text-slate-500 mb-1.5">
            <span className="flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5" style={{ color: "var(--color-primary)" }} />
              Nível {user.nivel}
            </span>
            <span>{user.xp % 100}/100 XP para o nível {user.nivel + 1}</span>
          </div>
          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${user.xp % 100}%`, background: "linear-gradient(90deg, var(--color-primary), var(--color-accent))" }} />
          </div>
        </div>

        {/* Conquistas (Badges) */}
        <div className="mt-6">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Conquistas</p>
          {medals.length === 0 ? (
            <p className="text-sm text-slate-400 italic">
              Nenhuma conquista ainda. Complete aulas e simulações para ganhar badges!
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {medals.map((m) => {
                const info = badgeLabels[m.tipoMedalha] || { label: m.tipoMedalha, icon: "🎖️" };
                return (
                  <span
                    key={m.id}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold shadow-sm"
                    style={{
                      background: "var(--color-accent)",      // Cor de destaque para badges
                      color: "var(--color-text-on-primary)",  // Garante contraste
                    }}
                    data-finbot-context={`Badge: ${info.label}. Uma conquista desbloqueada por completar um marco na plataforma EduFinance.`}
                  >
                    <span>{info.icon}</span>
                    <span>{info.label}</span>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* ── Últimas Simulações ── */}
      <Card
        title="Últimas Simulações"
        actions={<IconButton icon={Plus} label="Nova simulação" onClick={() => onTabChange("simulador")} />}
        data-finbot-context="Últimas simulações de investimento feitas no Simulador. O botão + abre o Simulador, onde você calcula quanto seu dinheiro vai crescer com juros compostos."
      >
        {simulations.length === 0 ? (
          <EmptyState
            icon={Calculator}
            title="Nenhuma simulação ainda"
            text="Vá ao Simulador para projetar seus investimentos!"
            action={
              <button
                onClick={() => onTabChange("simulador")}
                className="mt-2 bg-white hover:opacity-90 border font-bold py-2 px-4 rounded-sm shadow-sm transition flex items-center gap-2 text-xs"
                style={{ color: "var(--color-primary)", borderColor: "var(--color-primary)" }}
              >
                <Calculator className="w-3.5 h-3.5" />
                Nova Simulação
              </button>
            }
          />
        ) : (
          <div className="space-y-2">
            {simulations.slice(0, 4).map((sim) => (
              <div
                key={sim.id}
                className="flex justify-between items-center gap-3 bg-slate-50 p-3.5 rounded-sm border border-slate-100"
                data-finbot-context={`Simulação de ${sim.tipoInvestimento}: investimento inicial de R$${sim.valorInicial}, valor final projetado de R$${sim.valorFinal.toFixed(2)}. Uma simulação mostra quanto dinheiro você teria no futuro aplicando juros compostos.`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: "color-mix(in srgb, var(--color-primary) 12%, transparent)" }}>
                    <TrendingUp className="w-4 h-4" style={{ color: "var(--color-primary)" }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{sim.tipoInvestimento}</p>
                    <p className="text-xs text-slate-400 font-semibold">
                      Inicial: R$ {sim.valorInicial.toLocaleString("pt-BR")} · {sim.tempoMeses} meses
                    </p>
                  </div>
                </div>
                <span className="text-sm font-black text-emerald-600 shrink-0">
                  R$ {sim.valorFinal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
