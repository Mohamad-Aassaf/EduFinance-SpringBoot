/**
 * App.jsx — Componente raiz da aplicação
 *
 * NOVIDADES NESTA VERSÃO:
 * ─────────────────────────────────────────────────────────────────
 * 1. Sistema de PALETAS DE COR (Temas):
 *    - 7 paletas disponíveis, escolhidas pelo usuário no Perfil
 *    - Cada paleta define 3 variáveis CSS: primary, primaryDark, accent
 *    - Quando o usuário seleciona uma paleta, atualizamos as
 *      variáveis CSS no elemento <html> com document.documentElement.style.setProperty()
 *    - Como todos os componentes usam var(--color-primary) etc., 
 *      a mudança de cor é INSTANTÂNEA e GLOBAL
 *
 * 2. Dark Mode (já existia)
 *
 * 3. FinBot Inspector (botão flutuante global)
 */

import { useState, useEffect } from "react";
import Login from "./components/Login";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import Trilha from "./components/Trilha";
import FinBot from "./components/FinBot";
import Simulador from "./components/Simulador";
import Mercado from "./components/Mercado";
import Carteira from "./components/Carteira";
import Ranking from "./components/Ranking";
import Perfil from "./components/Perfil";
import Historico from "./components/Historico";
import FinBotInspector from "./components/FinBotInspector";
import AdminAiHostModal from "./components/AdminAiHostModal";
import { api } from "./api";
import { Flame, Moon, Sun, Menu, Server } from "lucide-react";

// ─── DEFINIÇÃO DAS PALETAS ────────────────────────────────────────────────────
/*
 * Cada paleta define:
 * - id:            identificador único (salvo no localStorage)
 * - name:          nome exibido ao usuário
 * - description:   breve descrição
 * - primary:       cor principal (botões, links, estados ativos)
 * - primaryDark:   cor escura (sidebar, cabeçalhos)
 * - accent:        cor de destaque (XP, conquistas, logo)
 * - textOnPrimary: cor do texto em botões principais (branco para azul, escuro para amarelo)
 * - preview:       array de 3 cores para o mini-swatch no seletor
 */
export const PALETTES = [
  {
    id: "original",
    name: "EduFinance Original",
    description: "Índigo clássico + esmeralda",
    primary: "#3b82f6",   // indigo-600 — a cor antiga dos botões
    primaryDark: "#101f3f",   // indigo-900 — a cor antiga da sidebar
    accent: "#10b981",   // emerald-500 — a cor antiga de destaques
    textOnPrimary: "#FFFFFF",
    preview: ["#3b82f6", "#101f3fs", "#10B981"],
  },
  {
    id: "blue",
    name: "EduFinance Atual",
    description: "Azul corporativo + laranja",
    primary: "#2563EB",
    primaryDark: "#1E3A8A",
    accent: "#F97316",
    textOnPrimary: "#FFFFFF",
    preview: ["#2563EB", "#1E3A8A", "#F97316"],
  },
  {
    id: "ocean",
    name: "Oceano",
    description: "Azul profundo (#003366 → #007acc)",
    primary: "#007acc",
    primaryDark: "#003366",
    accent: "#66a3ff",
    textOnPrimary: "#FFFFFF",
    preview: ["#007acc", "#003366", "#66a3ff"],
  },
  {
    id: "forest",
    name: "Floresta",
    description: "Verde natureza (#004d00 → #007a33)",
    primary: "#007a33",
    primaryDark: "#004d00",
    accent: "#66b3a1",
    textOnPrimary: "#FFFFFF",
    preview: ["#007a33", "#004d00", "#66b3a1"],
  },
  {
    id: "golden",
    name: "Dourado",
    description: "Amarelo vibrante (#ffcc00 → #ffdb4d)",
    primary: "#ffcc00",
    primaryDark: "#cc9900",
    accent: "#ffdb4d",
    textOnPrimary: "#0F172A",   // texto escuro em fundo amarelo (acessibilidade)
    preview: ["#ffcc00", "#cc9900", "#ffdb4d"],
  },
  {
    id: "ruby",
    name: "Rubi",
    description: "Vermelho intenso (#990000 → #cc3333)",
    primary: "#cc3333",
    primaryDark: "#990000",
    accent: "#ff6666",
    textOnPrimary: "#FFFFFF",
    preview: ["#cc3333", "#990000", "#ff6666"],
  },
  {
    id: "purple",
    name: "Roxo Real",
    description: "Violeta elegante (#4b0082 → #6a0dad)",
    primary: "#6a0dad",
    primaryDark: "#4b0082",
    accent: "#a64dff",
    textOnPrimary: "#FFFFFF",
    preview: ["#6a0dad", "#4b0082", "#a64dff"],
  },
];

// ─── FUNÇÃO: Aplicar paleta no CSS ───────────────────────────────────────────
/*
 * Esta função atualiza as variáveis CSS diretamente no elemento <html>.
 * Como os componentes usam var(--color-primary) etc., a mudança
 * é instantânea em TODA a aplicação.
 *
 * document.documentElement = o elemento <html> do DOM
 * style.setProperty(nome, valor) = define uma variável CSS inline
 */
function aplicarPaleta(paleta) {
  const html = document.documentElement;
  html.style.setProperty("--color-primary", paleta.primary);
  html.style.setProperty("--color-primary-dark", paleta.primaryDark);
  html.style.setProperty("--color-accent", paleta.accent);
  html.style.setProperty("--color-text-on-primary", paleta.textOnPrimary);
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showAdminAiModal, setShowAdminAiModal] = useState(false);
  const [aiConfig, setAiConfig] = useState(null);

  useEffect(() => {
    async function loadAiConfig() {
      try {
        const cfg = await api.get("/api/finbot/config");
        setAiConfig(cfg);
      } catch (e) {
        console.error("Erro ao obter config IA:", e);
      }
    }
    loadAiConfig();
  }, []);

  // ── Dark Mode ──────────────────────────────────────────────────
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("edufinance-dark") === "true";
  });

  useEffect(() => {
    const html = document.documentElement;
    if (darkMode) html.classList.add("dark");
    else html.classList.remove("dark");
    localStorage.setItem("edufinance-dark", String(darkMode));
  }, [darkMode]);

  // ── Paleta de Cores ────────────────────────────────────────────
  /*
   * Inicializa buscando o id salvo no localStorage.
   * Se não encontrar, usa "blue" (paleta atual).
   */
  const [paletteId, setPaletteId] = useState(() => {
    return localStorage.getItem("edufinance-palette") || "blue";
  });

  /*
   * Sempre que paletteId muda:
   * 1. Procura o objeto de paleta correspondente
   * 2. Aplica as variáveis CSS no <html>
   * 3. Salva a escolha no localStorage
   */
  useEffect(() => {
    const paleta = PALETTES.find((p) => p.id === paletteId) || PALETTES[1];
    aplicarPaleta(paleta);
    localStorage.setItem("edufinance-palette", paletteId);
  }, [paletteId]);

  // ── Autenticação ───────────────────────────────────────────────
  useEffect(() => {
    async function verificarAutenticacao() {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const perfil = await api.get("/api/perfis/me");
          setUser(perfil);
        } catch (err) {
          console.error("Token inválido ou expirado:", err);
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        }
      }
      setCheckingAuth(false);
    }
    verificarAutenticacao();
  }, []);

  const handleLoginSuccess = (perfil) => { setUser(perfil); setActiveTab("dashboard"); };
  const handleLogout = () => { localStorage.removeItem("token"); localStorage.removeItem("user"); setUser(null); };
  const handleUpdateUser = (updatedUser) => setUser(updatedUser);
  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-[#0F172A]">
        <div className="text-sm font-bold text-slate-400 animate-pulse uppercase tracking-wider">
          Carregando plataforma...
        </div>
      </div>
    );
  }

  return (
    <>
      {user ? (
        <div className="flex h-screen overflow-hidden" style={{ background: "var(--color-bg)" }}>

          <Sidebar
            user={user}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onLogout={handleLogout}
          />

          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Cabeçalho */}
            <header className="bg-white dark:bg-[#111d2e] border-b border-slate-100 dark:border-slate-700/30 py-4 px-8 flex justify-between items-center shrink-0">
              <button className="text-slate-400 hover:text-slate-600 transition focus:outline-none">
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-4">
                <div
                  data-finbot-context="Ofensiva de dias: mostra quantos dias seguidos você usa a plataforma EduFinance. Manter uma ofensiva diária te ajuda a criar o hábito de estudar finanças e pode desbloquear conquistas especiais."
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-black border shadow-sm select-none cursor-default"
                  style={{
                    background: "color-mix(in srgb, var(--color-accent) 15%, transparent)",
                    color: "var(--color-accent)",
                    borderColor: "color-mix(in srgb, var(--color-accent) 30%, transparent)",
                  }}
                >
                  <Flame className="w-4 h-4" style={{ fill: "var(--color-accent)", color: "var(--color-accent)" }} />
                  <span>1</span>
                </div>
                <button
                  onClick={() => setShowAdminAiModal(true)}
                  title="Configuração Admin do Servidor da IA (PC vs Notebook)"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 transition"
                >
                  <Server className="w-3.5 h-3.5 text-indigo-500" />
                  <span>IA: {aiConfig?.activeHostMode === "pc" ? "PC" : aiConfig?.activeHostMode === "notebook" ? "Notebook" : "Custom"}</span>
                  <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-amber-200 text-amber-900 rounded">
                    ADMIN
                  </span>
                </button>

                <button
                  onClick={toggleDarkMode}
                  title={darkMode ? "Modo claro" : "Modo escuro"}
                  className="text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-100 transition focus:outline-none p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50"
                >
                  {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
              </div>
            </header>

            {/* Conteúdo das abas */}
            <main
              className={`flex-1 min-h-0 ${activeTab === "finbot" ? "overflow-hidden flex flex-col" : "overflow-y-auto"}`}
              style={{ background: "var(--color-bg)" }}
            >
              {activeTab === "dashboard" && <Dashboard user={user} onTabChange={setActiveTab} />}
              {activeTab === "trilha" && <Trilha user={user} onUpdateUser={handleUpdateUser} />}
              {activeTab === "finbot" && (
                <div className="flex-1 min-h-0 flex flex-col"><FinBot /></div>
              )}
              {activeTab === "simulador" && <Simulador user={user} onUpdateUser={handleUpdateUser} />}
              {activeTab === "mercado" && <Mercado user={user} onUpdateUser={handleUpdateUser} />}
              {activeTab === "carteira" && <Carteira user={user} onUpdateUser={handleUpdateUser} />}
              {activeTab === "ranking" && <Ranking user={user} />}
              {activeTab === "perfil" && (
                /* Passamos paletteId e setPaletteId para o Perfil */
                <Perfil
                  user={user}
                  onUpdateUser={handleUpdateUser}
                  paletteId={paletteId}
                  onPaletteChange={setPaletteId}
                  palettes={PALETTES}
                />
              )}
              {activeTab === "historico" && <Historico user={user} />}
            </main>
          </div>

          <FinBotInspector />

          <AdminAiHostModal
            isOpen={showAdminAiModal}
            onClose={() => setShowAdminAiModal(false)}
            onConfigUpdated={(cfg) => setAiConfig(cfg)}
          />
        </div>
      ) : (
        <Login onLoginSuccess={handleLoginSuccess} />
      )}
    </>
  );
}
