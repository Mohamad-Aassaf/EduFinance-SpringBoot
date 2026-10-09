/**
 * Sidebar.jsx — Trilho lateral de navegação
 *
 * Exibe:
 * - Logo EduFinance
 * - Links de navegação em botões circulares (o ativo usa a cor primary)
 * - Avatar do usuário com nível/XP e botão de sair, no rodapé
 *
 * Tem dois formatos:
 * - Recolhido (padrão no desktop): só os ícones, com o nome no title
 * - Expandido: ícones + rótulos e a barra de progresso de XP
 * Em telas pequenas vira uma gaveta que abre por cima do conteúdo.
 *
 * Props recebidas:
 * - user: objeto com dados do usuário logado
 * - activeTab: string com o id da aba atual
 * - setActiveTab: função para mudar de aba
 * - onLogout: função chamada ao clicar em Sair
 * - expanded: mostra os rótulos (desktop)
 * - mobileOpen / onCloseMobile: controle da gaveta (mobile)
 */

import {
  BookOpen, Calculator, Trophy, User,
  History, MessageSquare, LogOut, LayoutDashboard, LineChart, ShieldCheck
} from "lucide-react";
import { Avatar } from "./ui";

// Lista de itens do menu com id, label e ícone
// O id precisa bater com os valores usados no App.jsx para trocar de aba
export const MENU_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "trilha", label: "Trilha de Aprendizado", icon: BookOpen },
  { id: "finbot", label: "Professor FinBot", icon: MessageSquare },
  { id: "simulador", label: "Simulador", icon: Calculator },
  { id: "mercado", label: "Mercado", icon: LineChart },
  { id: "carteira", label: "Carteira", icon: ShieldCheck },
  { id: "ranking", label: "Ranking", icon: Trophy },
  { id: "perfil", label: "Perfil", icon: User },
  { id: "historico", label: "Histórico", icon: History },
];

export default function Sidebar({ user, activeTab, setActiveTab, onLogout, expanded, mobileOpen, onCloseMobile }) {
  /*
   * Calcula o progresso para o próximo nível.
   * Cada nível exige 100 XP. O % (módulo) nos dá o resto da divisão.
   */
  const xpProgress = user.xp % 100;

  // Na gaveta do mobile os rótulos sempre aparecem
  const showLabels = expanded || mobileOpen;

  const irPara = (id) => {
    setActiveTab(id);
    onCloseMobile();
  };

  return (
    <>
      {/* Fundo escurecido atrás da gaveta (só no mobile) */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-slate-950/50 z-30 md:hidden" onClick={onCloseMobile} />
      )}

      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-40 h-screen shrink-0
          flex flex-col justify-between overflow-y-auto overflow-x-hidden
          transition-all duration-200
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0
          ${showLabels ? "w-64" : "w-64 md:w-[4.75rem]"}
        `}
        style={{ background: "var(--color-primary-dark)" }}
      >
        {/* ── Parte de cima: logo + menu ── */}
        <div className={`py-5 space-y-5 ${showLabels ? "px-4" : "px-4 md:px-0"}`}>

          {/* LOGO */}
          <h1 className={`text-2xl font-extrabold tracking-wide py-1 ${showLabels ? "px-1" : "md:text-center"}`}>
            <span className="text-white">{showLabels ? "Edu" : "E"}</span>
            {/* Accent color via CSS var — muda com a paleta selecionada */}
            <span style={{ color: "var(--color-accent)" }}>{showLabels ? "Finance" : "F"}</span>
          </h1>

          {/* MENU DE NAVEGAÇÃO */}
          <nav className={`flex flex-col gap-2 ${showLabels ? "" : "md:items-center"}`}>
            {MENU_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id; // Verifica se esta aba está ativa

              return (
                <button
                  key={item.id}
                  onClick={() => irPara(item.id)}
                  title={item.label}
                  aria-current={active ? "page" : undefined}
                  className={`
                    group flex items-center gap-3 rounded-full text-sm font-semibold
                    transition-all duration-150 focus:outline-none
                    ${showLabels ? "w-full pr-4" : "w-full md:w-auto pr-4 md:pr-0"}
                    ${active ? "text-white" : "text-blue-100/70 hover:text-white"}
                  `}
                >
                  {/* Círculo do ícone: cor primary quando ativo */}
                  <span
                    className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition ${
                      active ? "shadow-md" : "bg-white/10 group-hover:bg-white/20"
                    }`}
                    style={active ? { background: "var(--color-primary)", color: "var(--color-text-on-primary)" } : {}}
                  >
                    <Icon className="w-[1.1rem] h-[1.1rem]" />
                  </span>
                  <span className={`truncate ${showLabels ? "" : "md:hidden"}`}>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* ── Parte de baixo: usuário + sair ── */}
        <div className={`py-4 border-t border-white/10 flex flex-col gap-3 ${showLabels ? "px-4" : "px-4 md:px-0 md:items-center"}`}>
          <button
            onClick={() => irPara("perfil")}
            title={`${user.nome} — Nível ${user.nivel}, ${user.xp} XP`}
            className={`flex items-center gap-3 text-left focus:outline-none ${showLabels ? "w-full" : "w-full md:w-auto"}`}
            data-finbot-context={`Painel do usuário ${user.nome}. Nível atual: ${user.nivel}. XP total: ${user.xp}. O XP (pontos de experiência) é ganho ao completar aulas e simulações. A cada 100 XP você sobe de nível.`}
          >
            <Avatar nome={user.nome} avatarUrl={user.avatarUrl} className="w-11 h-11 text-lg ring-2 ring-white/20" />
            <div className={`min-w-0 flex-1 ${showLabels ? "" : "md:hidden"}`}>
              <p className="font-bold text-sm text-white truncate">{user.nome}</p>
              <div className="flex items-center gap-1.5 text-xs text-blue-200 mt-0.5">
                <span className="font-semibold">Nível {user.nivel}</span>
                <span>•</span>
                {/* XP em destaque com a cor de accent da paleta */}
                <span style={{ color: "var(--color-accent)" }} className="font-bold">{user.xp} XP</span>
              </div>
              {/* BARRA DE PROGRESSO XP */}
              <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-1.5">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${xpProgress}%`, background: "var(--color-accent)" }}
                />
              </div>
            </div>
          </button>

          <button
            onClick={onLogout}
            title="Sair"
            className={`group flex items-center gap-3 rounded-full text-sm font-semibold text-blue-100/70 hover:text-red-300 transition focus:outline-none ${
              showLabels ? "w-full" : "w-full md:w-auto"
            }`}
          >
            <span className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 bg-white/10 group-hover:bg-red-900/40 transition">
              <LogOut className="w-[1.1rem] h-[1.1rem]" />
            </span>
            <span className={showLabels ? "" : "md:hidden"}>Sair</span>
          </button>
        </div>
      </aside>
    </>
  );
}
