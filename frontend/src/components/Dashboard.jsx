/**
 * Dashboard.jsx — Painel principal do usuário
 *
 * Exibe um resumo geral:
 * - Saudação personalizada
 * - Cards de estatísticas (Nível, XP, Progresso, Badges)
 * - Barra de progresso da trilha
 * - Botões de ação rápida
 * - Conquistas (medalhas)
 * - Últimas simulações
 *
 * Paleta de cores:
 * - Azul (#2563EB): botões principais e elementos de aprendizado
 * - Laranja (#F97316): XP, conquistas e gamificação
 * - Verde: progresso concluído
 */

import { Trophy, Zap, BookOpen, Award, Calculator, TrendingUp } from "lucide-react";
import { useState, useEffect } from "react";
import { api } from "../api";

export default function Dashboard({ user, onTabChange }) {
  const [lessons, setLessons] = useState([]);
  const [progress, setProgress] = useState([]);
  const [medals, setMedals] = useState([]);
  const [simulations, setSimulations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Carrega todos os dados do painel em paralelo
  useEffect(() => {
    async function carregarDados() {
      try {
        const [licoes, progressos, medalhas, sims] = await Promise.all([
          api.get("/api/licoes"),
          api.get(`/api/licoes/usuario/${user.id}/progresso`),
          api.get(`/api/perfis/${user.id}/medalhas`),
          api.get(`/api/simulacoes/usuario/${user.id}`),
        ]);
        setLessons(licoes);
        setProgress(progressos);
        setMedals(medalhas);
        setSimulations(sims);
      } catch (err) {
        console.error("Erro ao carregar dados do painel:", err);
      } finally {
        setLoading(false);
      }
    }
    carregarDados();
  }, [user.id]);

  // Calcula o percentual de progresso na trilha
  const totalLessons = lessons.length || 5;
  const completedLessons = progress.filter((p) => p.concluido).length;
  const progressPercent = Math.round((completedLessons / totalLessons) * 100) || 0;

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
    <div className="p-8 max-w-5xl mx-auto space-y-6 animate-fade-in">

      {/* ── Saudação ── */}
      <div>
        <h2 className="text-3xl font-extrabold text-slate-800">
          Olá, {user.nome}! 👋
        </h2>
        <p className="text-slate-500 mt-1">Continue sua jornada de educação financeira.</p>
      </div>

      {/* ── Grid de Estatísticas (4 cards) ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

        {/* Card: Nível */}
        <div
          className="bg-white p-5 rounded-sm shadow-sm border border-slate-100 flex items-center justify-between"
          data-finbot-context="Nível do usuário na plataforma EduFinance. O nível sobe a cada 100 pontos de XP conquistados. Níveis mais altos desbloqueiam novos conteúdos e badges especiais."
        >
          <div>
            <p className="text-3xl font-black text-slate-800">{user.nivel}</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">Nível</p>
          </div>
          {/* Ícone em azul (elemento de progresso/aprendizado) */}
          <div className="w-11 h-11 rounded-sm flex items-center justify-center"
            style={{ background: "color-mix(in srgb, var(--color-primary) 12%, transparent)" }}>
            <Award className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
          </div>
        </div>

        {/* Card: XP — cor laranja */}
        <div
          className="bg-white p-5 rounded-sm shadow-sm border border-slate-100 flex items-center justify-between"
          data-finbot-context={`XP (Pontos de Experiência) do usuário: ${user.xp} XP. Você ganha XP ao concluir aulas, responder perguntas corretamente e fazer simulações. Acumule 100 XP para subir de nível!`}
        >
          <div>
            <p className="text-3xl font-black text-slate-800">{user.xp}</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">XP Total</p>
          </div>
          {/* Laranja = XP, conquistas, gamificação */}
          <div className="w-11 h-11 rounded-sm flex items-center justify-center"
            style={{ background: "color-mix(in srgb, var(--color-accent) 12%, transparent)" }}>
            <Zap className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
          </div>
        </div>

        {/* Card: Progresso */}
        <div
          className="bg-white p-5 rounded-sm shadow-sm border border-slate-100 flex items-center justify-between"
          data-finbot-context={`Progresso na Trilha de Aprendizado: ${progressPercent}% completo (${completedLessons} de ${totalLessons} aulas). Complete todas as aulas para dominar educação financeira!`}
        >
          <div>
            <p className="text-3xl font-black text-slate-800">{progressPercent}%</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">Progresso</p>
          </div>
          <div className="w-11 h-11 bg-emerald-50 rounded-sm flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-emerald-500" />
          </div>
        </div>

        {/* Card: Badges — laranja (conquista/gamificação) */}
        <div
          className="bg-white p-5 rounded-sm shadow-sm border border-slate-100 flex items-center justify-between"
          data-finbot-context={`Badges (insígnias) conquistados: ${medals.length} badges. Badges são prêmios virtuais que você ganha ao atingir marcos na plataforma, como concluir sua primeira aula ou fazer sua primeira simulação.`}
        >
          <div>
            <p className="text-3xl font-black text-slate-800">{medals.length}</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">Badges</p>
          </div>
          {/* Accent color para conquistas/achievements */}
          <div className="w-11 h-11 rounded-sm flex items-center justify-center"
            style={{ background: "color-mix(in srgb, var(--color-accent) 12%, transparent)" }}>
            <Trophy className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
          </div>
        </div>
      </div>

      {/* ── Barra de Progresso na Trilha ── */}
      <div
        className="bg-white p-6 rounded-sm shadow-sm border border-slate-100 space-y-3"
        data-finbot-context="Barra de Progresso na Trilha de Aprendizado. Mostra visualmente quantas aulas foram concluídas no total. Azul representa o progresso já feito, cinza o que falta."
      >
        <h3 className="text-sm font-bold text-slate-800">Progresso na Trilha</h3>
        {/* Barra de fundo cinza */}
        <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden">
          {/* Preenchimento azul proporcional ao progresso */}
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${progressPercent}%`, background: "var(--color-primary)" }}
          />
        </div>
        <p className="text-sm text-slate-500 font-medium">
          {completedLessons} de {totalLessons} aulas concluídas
        </p>
      </div>

      {/* ── Botões de Ação Rápida ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Botão principal: usa var(--color-primary) e var(--color-text-on-primary) */}
        <button
          onClick={() => onTabChange("trilha")}
          className="font-bold py-4 px-4 rounded-sm shadow-md transition-all duration-150 active:scale-98 flex items-center justify-center gap-2 text-sm hover:opacity-90"
          style={{ background: "var(--color-primary)", color: "var(--color-text-on-primary)" }}
          data-finbot-context="Botão 'Continuar Aprendendo': leva você à Trilha de Aprendizado, onde há aulas curtas sobre finanças no estilo Duolingo. Complete aulas para ganhar XP e subir de nível!"
        >
          <BookOpen className="w-4 h-4" />
          Continuar Aprendendo
        </button>

        {/* Botão secundário: outline com a cor primary */}
        <button
          onClick={() => onTabChange("simulador")}
          className="bg-white hover:opacity-90 border font-bold py-4 px-4 rounded-sm shadow-sm transition flex items-center justify-center gap-2 text-sm"
          style={{ color: "var(--color-primary)", borderColor: "var(--color-primary)" }}
          data-finbot-context="Botão 'Nova Simulação': abre o Simulador de Investimentos, onde você pode calcular quanto seu dinheiro vai crescer com juros compostos ao longo do tempo."
        >
          <Calculator className="w-4 h-4" />
          Nova Simulação
        </button>
      </div>

      {/* ── Conquistas (Badges) ── */}
      <div className="bg-white p-6 rounded-sm shadow-sm border border-slate-100 space-y-4">
        <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
          Conquistas
        </h3>
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

      {/* ── Últimas Simulações ── */}
      <div className="bg-white p-6 rounded-sm shadow-sm border border-slate-100 space-y-4">
        <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
          Últimas Simulações
        </h3>
        {simulations.length === 0 ? (
          <p className="text-sm text-slate-400 italic">
            Nenhuma simulação ainda. Vá ao Simulador para projetar seus investimentos!
          </p>
        ) : (
          <div className="space-y-2">
            {simulations.slice(0, 3).map((sim) => (
              <div
                key={sim.id}
                className="flex justify-between items-center bg-slate-50 p-4 rounded-sm border border-slate-100"
                data-finbot-context={`Simulação de ${sim.tipoInvestimento}: investimento inicial de R$${sim.valorInicial}, valor final projetado de R$${sim.valorFinal.toFixed(2)}. Uma simulação mostra quanto dinheiro você teria no futuro aplicando juros compostos.`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ background: "#EFF6FF" }}>
                    <TrendingUp className="w-4 h-4" style={{ color: "#2563EB" }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{sim.tipoInvestimento}</p>
                    <p className="text-xs text-slate-400 font-semibold">
                      Inicial: R$ {sim.valorInicial.toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-black text-emerald-600">
                  R$ {sim.valorFinal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
