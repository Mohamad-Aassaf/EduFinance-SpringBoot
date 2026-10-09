/**
 * Perfil.jsx — Página de Perfil do Usuário
 *
 * NOVIDADES:
 * ──────────────────────────────────────────────────────────────────────
 * 1. SELETOR DE PALETA DE CORES
 *    - Exibe as 7 paletas disponíveis como swatches visuais
 *    - Ao clicar, chama onPaletteChange() que está no App.jsx
 *    - O App aplica as variáveis CSS globalmente
 *
 * 2. REFAZER TESTE DE PERFIL DE INVESTIDOR
 *    - 5 perguntas de múltipla escolha
 *    - Cada resposta tem pontuação (1, 3 ou 5 pontos)
 *    - Total: 5 a 25 pontos
 *    - Resultado: Conservador (5-11), Moderado (12-18), Arrojado (19-25)
 *    - Salvo no localStorage (sem necessidade de endpoint de API extra)
 *
 * Props recebidas:
 * - user, onUpdateUser: dados e atualização do usuário
 * - paletteId: id da paleta atual (string)
 * - onPaletteChange: função para mudar a paleta
 * - palettes: array de paletas disponíveis (vem do App.jsx)
 */

import { useState, useEffect } from "react";
import {
  Award, Zap, Trophy, Flame, Star, BookOpen, TrendingUp,
  Calendar, Shield, Sparkles, Crown, Pencil, Palette,
  ChevronRight, CheckCircle, RefreshCw, X, Server
} from "lucide-react";
import { api } from "../api";
import AdminAiHostModal from "./AdminAiHostModal";

// ─── PERGUNTAS DO TESTE DE PERFIL DE INVESTIDOR ────────────────────────────
/*
 * Cada pergunta tem 3 opções com pontuações diferentes (1, 3 ou 5).
 * Somar os pontos de todas as respostas dá o "score" do perfil:
 *   5 a 11  → Conservador
 *  12 a 18  → Moderado
 *  19 a 25  → Arrojado
 */
const PERGUNTAS = [
  {
    id: 1,
    texto: "Qual é o seu objetivo principal ao investir?",
    opcoes: [
      { texto: "Proteger meu dinheiro da inflação e ter segurança", pontos: 1 },
      { texto: "Crescimento moderado aceitando algum risco", pontos: 3 },
      { texto: "Maximizar lucros mesmo com riscos altos", pontos: 5 },
    ],
  },
  {
    id: 2,
    texto: "Por quanto tempo você pretende deixar o dinheiro investido?",
    opcoes: [
      { texto: "Menos de 1 ano (preciso no curto prazo)", pontos: 1 },
      { texto: "Entre 1 e 5 anos", pontos: 3 },
      { texto: "Mais de 5 anos (penso no longo prazo)", pontos: 5 },
    ],
  },
  {
    id: 3,
    texto: "Se sua carteira cair 20% em um mês, o que você faria?",
    opcoes: [
      { texto: "Venderia tudo imediatamente para parar o prejuízo", pontos: 1 },
      { texto: "Manteria os investimentos e esperaria recuperar", pontos: 3 },
      { texto: "Aproveitaria para comprar mais na baixa", pontos: 5 },
    ],
  },
  {
    id: 4,
    texto: "Qual percentual da sua renda você consegue investir por mês?",
    opcoes: [
      { texto: "Menos de 5%", pontos: 1 },
      { texto: "Entre 5% e 20%", pontos: 3 },
      { texto: "Mais de 20%", pontos: 5 },
    ],
  },
  {
    id: 5,
    texto: "Como você se descreve em relação a finanças e investimentos?",
    opcoes: [
      { texto: "Iniciante — prefiro investimentos seguros e simples", pontos: 1 },
      { texto: "Intermediário — tenho alguma experiência e aceito riscos médios", pontos: 3 },
      { texto: "Experiente — confortável com alta volatilidade e diversificação", pontos: 5 },
    ],
  },
];

// Converte pontuação total para texto do perfil
function calcularPerfil(score) {
  if (score <= 11) return { label: "Conservador", emoji: "🛡️", cor: "text-blue-600", desc: "Prefere segurança. Ideal: Tesouro Selic, CDB, Poupança." };
  if (score <= 18) return { label: "Moderado", emoji: "⚖️", cor: "text-amber-600", desc: "Equilíbrio entre risco e retorno. Ideal: Fundos, LCI, ações blue chips." };
  return { label: "Arrojado", emoji: "🚀", cor: "text-rose-600", desc: "Alta tolerância a risco. Ideal: Ações, FIIs, ETFs, cripto." };
}

// ─── BADGES ────────────────────────────────────────────────────────────────
const ALL_BADGES = [
  { type: "first_lesson", label: "Primeira Aula", description: "Completou a primeira aula", icon: BookOpen, color: "text-blue-500 bg-blue-50 border-blue-200" },
  { type: "Simulador Pro", label: "Primeiro Simulador", description: "Fez a primeira simulação", icon: TrendingUp, color: "text-emerald-500 bg-emerald-50 border-emerald-200" },
  { type: "module_complete", label: "Módulo Completo", description: "Completou todas as aulas", icon: Crown, color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
  { type: "streak_7", label: "Ofensiva 7 dias", description: "Estudou 7 dias seguidos", icon: Flame, color: "text-orange-500 bg-orange-50 border-orange-200" },
  { type: "streak_30", label: "Ofensiva 30 dias", description: "Estudou 30 dias seguidos", icon: Flame, color: "text-orange-500 bg-orange-50 border-orange-200" },
];

// ─── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────
export default function Perfil({ user, onUpdateUser, paletteId, onPaletteChange, palettes }) {
  // Dados do perfil
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [medals, setMedals] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [progress, setProgress] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edição de nome
  const [editModal, setEditModal] = useState(false);
  const [editName, setEditName] = useState(user.nome);

  // Teste de perfil de investidor
  const [showTeste, setShowTeste] = useState(false);  // Exibe o modal do teste
  const [respostas, setRespostas] = useState({});     // { perguntaId: pontos }
  const [resultado, setResultado] = useState(null);   // Resultado final

  // Carrega o resultado salvo no localStorage ao montar o componente
  const [perfilInvestidor, setPerfilInvestidor] = useState(() => {
    const saved = localStorage.getItem("edufinance-perfil-investidor");
    return saved || "Arrojado";
  });

  // ── Carregar dados ──────────────────────────────────────────────
  async function loadProfileData() {
    try {
      const [medalsList, lessonsList, progressList, txList] = await Promise.all([
        api.get(`/api/perfis/${user.id}/medalhas`),
        api.get("/api/licoes"),
        api.get(`/api/licoes/usuario/${user.id}/progresso`),
        api.get(`/api/portfolio/transacoes/usuario/${user.id}`),
      ]);
      setMedals(medalsList);
      setLessons(lessonsList);
      setProgress(progressList);
      setTransactions(txList);
    } catch (err) {
      console.error("Erro ao carregar perfil:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfileData();
  }, [user.id]);

  // Estatísticas calculadas
  const earnedTypes = new Set(medals.map((m) => m.tipoMedalha));
  const completedLessons = progress.filter((p) => p.concluido).length;
  const totalLessons = lessons.length || 5;
  const progressPercent = Math.round((completedLessons / totalLessons) * 100) || 0;
  const xpProgress = user.xp % 100;

  // ── Editar nome ─────────────────────────────────────────────────
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editName.trim()) return;
    try {
      const updated = await api.put(`/api/perfis/${user.id}`, { nome: editName.trim() });
      onUpdateUser(updated);
      setEditModal(false);
    } catch (err) {
      console.error("Erro ao atualizar perfil:", err);
    }
  };

  // ── Teste de Perfil de Investidor ───────────────────────────────
  /*
   * Quando o usuário clica em uma opção, registramos os pontos
   * naquele Map de respostas usando o id da pergunta como chave.
   */
  function responder(perguntaId, pontos) {
    setRespostas((prev) => ({ ...prev, [perguntaId]: pontos }));
  }

  /*
   * Calcula a soma de todos os pontos e determina o perfil.
   * Salva no localStorage e fecha o modal.
   */
  function finalizarTeste() {
    const totalPontos = Object.values(respostas).reduce((sum, p) => sum + p, 0);
    const perfil = calcularPerfil(totalPontos);
    setResultado(perfil);
    setPerfilInvestidor(perfil.label);
    localStorage.setItem("edufinance-perfil-investidor", perfil.label);
  }

  function fecharTeste() {
    setShowTeste(false);
    setRespostas({});
    setResultado(null);
  }

  const todasRespondidas = Object.keys(respostas).length === PERGUNTAS.length;

  if (loading) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="text-gray-500 font-medium animate-pulse">Carregando perfil...</div>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-8 pt-2 pb-8 max-w-3xl mx-auto space-y-6 animate-fade-in">

      {/* ── Hero Card ── */}
      <div className="bg-white rounded-sm border border-slate-100 shadow-sm p-6 relative overflow-hidden flex flex-col sm:flex-row items-center gap-6">
        <div className="absolute inset-0 pointer-events-none opacity-30"
          style={{ background: `radial-gradient(circle at top right, color-mix(in srgb, var(--color-primary) 20%, transparent), transparent 70%)` }} />

        {/* Avatar */}
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-white font-extrabold text-3xl shadow-md border-4 border-white/80"
          style={{ background: "var(--color-primary)" }}
        >
          {user.nome.charAt(0).toUpperCase()}
        </div>

        {/* Informações */}
        <div className="flex-1 text-center sm:text-left space-y-2.5">
          <div className="flex items-center justify-center sm:justify-start gap-2.5">
            <h2 className="text-2xl font-black text-slate-800">{user.nome}</h2>
            <button
              onClick={() => { setEditName(user.nome); setEditModal(true); }}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 transition"
            >
              <Pencil className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 text-xs font-bold">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border"
              style={{ background: "color-mix(in srgb, var(--color-primary) 10%, transparent)", color: "var(--color-primary)", borderColor: "color-mix(in srgb, var(--color-primary) 20%, transparent)" }}>
              <Award className="w-3.5 h-3.5" /> Nível {user.nivel}
            </span>
            <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-600 px-2.5 py-1 rounded-full border border-orange-100"
              style={{ color: "var(--color-accent)" }}>
              <Zap className="w-3.5 h-3.5" /> {user.xp} XP
            </span>
            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full border border-emerald-100">
              <Trophy className="w-3.5 h-3.5" /> Ranking Ativo
            </span>
          </div>

          {/* Barra de XP */}
          <div className="max-w-xs mx-auto sm:mx-0 pt-1">
            <div className="flex justify-between text-[10px] text-slate-400 font-bold mb-1">
              <span>Progresso para Nível {user.nivel + 1}</span>
              <span>{xpProgress}/100 XP</span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${xpProgress}%`, background: "var(--color-accent)" }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Grid de Estatísticas Rápidas ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: BookOpen, label: "Aulas Concluídas", value: `${completedLessons}/${totalLessons}`, color: "text-blue-500 bg-blue-50" },
          { icon: Flame, label: "Ofensiva Atual", value: "1 dia", color: "text-orange-500 bg-orange-50" },
          { icon: Star, label: "Maior Ofensiva", value: "1 dia", color: "text-yellow-600 bg-yellow-50" },
          { icon: TrendingUp, label: "Transações", value: `${transactions.length}`, color: "text-emerald-500 bg-emerald-50" },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-white p-4 rounded-sm border border-slate-100 shadow-sm text-center space-y-1">
              <div className={`w-8 h-8 rounded-lg ${stat.color} flex items-center justify-center mx-auto mb-1`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-base font-extrabold text-slate-800">{stat.value}</p>
              <p className="text-[10px] font-bold text-slate-400">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* ── Progresso + Perfil de Investidor ── */}
      <div className="bg-white p-5 rounded-sm shadow-sm border border-slate-100 space-y-4">
        <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          Progresso Geral
        </h3>

        {/* Barra de progresso */}
        <div>
          <div className="flex justify-between text-xs font-bold text-slate-600 mb-1.5">
            <span>Trilha de Aprendizado</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%`, background: "var(--color-primary)" }}
            />
          </div>
        </div>

        {/* Perfil de investidor com botão de refazer */}
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-sm text-xs border border-slate-100">
          <div className="flex items-center gap-2 font-bold text-slate-600">
            <Shield className="w-4 h-4" style={{ color: "var(--color-primary)" }} />
            <span>
              Perfil de investidor:{" "}
              <span className="capitalize font-extrabold" style={{ color: "var(--color-primary)" }}>
                {perfilInvestidor}
              </span>
            </span>
          </div>
          {/* Botão de refazer o teste */}
          <button
            onClick={() => { setShowTeste(true); setRespostas({}); setResultado(null); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-bold text-white transition hover:opacity-90"
            style={{ background: "var(--color-primary)" }}
          >
            <RefreshCw className="w-3 h-3" />
            Refazer Teste
          </button>
        </div>
      </div>

      {/* ── SELETOR DE PALETA DE CORES ─────────────────────────────────── */}
      <div className="bg-white p-5 rounded-sm shadow-sm border border-slate-100 space-y-4">
        <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
          <Palette className="w-4 h-4" style={{ color: "var(--color-primary)" }} />
          Paleta de Cores
          <span className="text-[10px] font-normal text-slate-400 ml-1">
            — Personalize as cores da plataforma
          </span>
        </h3>

        {/*
         * Grid de paletas:
         * Cada card exibe o nome, descrição e um "swatch" com 3 cores.
         * Ao clicar, chamamos onPaletteChange(id) que vai ao App.jsx
         * e aplica as variáveis CSS globalmente.
         */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {palettes.map((p) => {
            const ativa = p.id === paletteId;
            return (
              <button
                key={p.id}
                onClick={() => onPaletteChange(p.id)}
                className={`
                  text-left p-3.5 rounded-sm border-2 transition-all duration-200
                  flex items-center gap-3 group
                  ${ativa
                    ? "border-current shadow-sm"          // borda colorida quando ativa
                    : "border-slate-100 hover:border-slate-300"
                  }
                `}
                style={ativa ? { borderColor: p.primary } : {}}
              >
                {/* Mini-swatch: 3 cores da paleta */}
                <div className="flex rounded-lg overflow-hidden shrink-0 shadow-sm">
                  {p.preview.map((cor, i) => (
                    <div
                      key={i}
                      className="w-7 h-7"
                      style={{ background: cor }}
                    />
                  ))}
                </div>

                {/* Nome e descrição */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-extrabold text-slate-800">{p.name}</p>
                    {ativa && (
                      <CheckCircle className="w-3.5 h-3.5 shrink-0" style={{ color: p.primary }} />
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">{p.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── SERVIDOR DA IA (ADMIN) ─────────────────────────────────── */}
      <div className="bg-white p-5 rounded-sm shadow-sm border border-slate-100 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Server className="w-4 h-4 text-indigo-500" />
            Servidor da IA (Ollama)
            <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">
              ADMIN
            </span>
          </h3>
          <button
            onClick={() => setShowAdminModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-sm text-xs font-bold transition shadow-sm"
          >
            <Server className="w-3.5 h-3.5" />
            Alternar PC / Notebook
          </button>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          Alterne o servidor onde o modelo Ollama está rodando entre o seu computador desktop (<strong>PC via Tailscale: 100.83.132.45</strong>) ou o <strong>Notebook local (localhost)</strong>.
        </p>
      </div>

      <AdminAiHostModal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
      />

      {/* ── Conquistas (Badges) ── */}
      <div className="bg-white p-5 rounded-sm shadow-sm border border-slate-100 space-y-4">
        <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-orange-500" />
          Conquistas
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ALL_BADGES.map((badge) => {
            const dbEquivalent = badge.type === "first_lesson" ? "Primeira Aula" : badge.type;
            const earned = earnedTypes.has(badge.type) || earnedTypes.has(dbEquivalent);
            const Icon = badge.icon;
            return (
              <div
                key={badge.type}
                className={`flex items-center gap-3 p-3.5 rounded-sm border transition-all ${earned
                  ? `bg-white ${badge.color} border-slate-200 shadow-sm`
                  : "bg-slate-50/50 border-slate-100 opacity-40 grayscale"
                  }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${earned ? "bg-white/80" : "bg-slate-200"}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-slate-800">{badge.label}</h4>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">{badge.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          MODAL: Teste de Perfil de Investidor
          ════════════════════════════════════════════════════════════ */}
      {showTeste && (
        <div className="fixed inset-0 bg-slate-950/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-sm max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden">

            {/* Cabeçalho do modal */}
            <div
              className="px-6 py-4 flex items-center justify-between"
              style={{ background: "var(--color-primary)" }}
            >
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Teste de Perfil de Investidor
                </h3>
                <p className="text-xs text-white/70 mt-0.5">5 perguntas rápidas para descobrir seu perfil</p>
              </div>
              <button onClick={fecharTeste} className="text-white/70 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* ── Se ainda não há resultado: exibe as perguntas ── */}
              {!resultado ? (
                <>
                  {PERGUNTAS.map((pergunta, idx) => (
                    <div key={pergunta.id} className="space-y-2">
                      {/* Número e texto da pergunta */}
                      <p className="text-sm font-bold text-slate-800">
                        <span
                          className="inline-block w-6 h-6 rounded-full text-white text-xs font-black text-center leading-6 mr-2"
                          style={{ background: "var(--color-primary)" }}
                        >
                          {idx + 1}
                        </span>
                        {pergunta.texto}
                      </p>

                      {/* Opções de resposta */}
                      <div className="space-y-1.5 pl-8">
                        {pergunta.opcoes.map((opcao, oi) => {
                          const selecionada = respostas[pergunta.id] === opcao.pontos;
                          return (
                            <button
                              key={oi}
                              onClick={() => responder(pergunta.id, opcao.pontos)}
                              className={`
                                w-full text-left px-3 py-2.5 rounded-sm text-xs font-semibold border
                                transition-all duration-150
                                ${selecionada
                                  ? "text-white border-transparent shadow-sm"   // selecionada: cor primary
                                  : "text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                }
                              `}
                              style={selecionada ? { background: "var(--color-primary)" } : {}}
                            >
                              {opcao.texto}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {/* Botão finalizar — só habilitado quando tudo respondido */}
                  <button
                    onClick={finalizarTeste}
                    disabled={!todasRespondidas}
                    className="w-full py-3 rounded-sm text-sm font-bold transition disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: todasRespondidas ? "var(--color-primary)" : "#e2e8f0",
                      color: todasRespondidas ? "var(--color-text-on-primary)" : "#94a3b8",
                    }}
                  >
                    {todasRespondidas
                      ? "Ver meu resultado →"
                      : `Responda todas as ${PERGUNTAS.length} perguntas`}
                  </button>
                </>
              ) : (
                /* ── Tela de Resultado ── */
                <div className="text-center space-y-4 py-4 animate-fade-in">
                  <div className="text-5xl">{resultado.emoji}</div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Seu perfil é</p>
                    <h2 className={`text-3xl font-black mt-1 ${resultado.cor}`}>{resultado.label}</h2>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed max-w-sm mx-auto">
                    {resultado.desc}
                  </p>
                  <div className="bg-slate-50 rounded-sm p-4 text-xs text-slate-500 border border-slate-100">
                    <p className="font-bold text-slate-700 mb-1">O que isso significa?</p>
                    {resultado.label === "Conservador" && "Você prioriza a segurança do capital. Investimentos de renda fixa são os mais adequados para você."}
                    {resultado.label === "Moderado" && "Você busca equilíbrio. Uma carteira mista de renda fixa e variável é ideal."}
                    {resultado.label === "Arrojado" && "Você aceita volatilidade em troca de maiores retornos. Ações e ETFs são seus aliados."}
                  </div>
                  <button
                    onClick={fecharTeste}
                    className="w-full py-3 rounded-sm text-sm font-bold text-white transition hover:opacity-90"
                    style={{ background: "var(--color-primary)" }}
                  >
                    Concluir
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          MODAL: Editar Nome
          ════════════════════════════════════════════════════════════ */}
      {editModal && (
        <div className="fixed inset-0 bg-slate-950/40 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-sm max-w-sm w-full p-6 relative shadow-2xl border border-slate-100 space-y-4">
            <button
              onClick={() => setEditModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold text-lg"
            >
              ✕
            </button>
            <h3 className="text-lg font-bold text-slate-800">Editar Nome</h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  maxLength={50}
                  className="w-full px-3 py-2 border border-slate-200 rounded-sm focus:outline-none text-sm font-semibold"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditModal(false)}
                  className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-sm text-xs transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-1/2 font-bold py-2 rounded-sm text-xs shadow-md transition text-white hover:opacity-90"
                  style={{ background: "var(--color-primary)" }}
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
