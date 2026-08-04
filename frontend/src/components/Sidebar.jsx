/**
 * Sidebar.jsx — Barra lateral de navegação
 *
 * Exibe:
 * - Logo EduFinance
 * - Avatar e informações do usuário (nível, XP)
 * - Barra de progresso de XP em laranja (#F97316)
 * - Links de navegação (o ativo é destacado em azul #2563EB)
 * - Botão de sair
 *
 * Props recebidas:
 * - user: objeto com dados do usuário logado
 * - activeTab: string com o id da aba atual
 * - setActiveTab: função para mudar de aba
 * - onLogout: função chamada ao clicar em Sair
 */

import {
  BookOpen, Calculator, Trophy, Zap, User,
  History, MessageSquare, LogOut, LayoutDashboard, LineChart, ShieldCheck
} from "lucide-react";

export default function Sidebar({ user, activeTab, setActiveTab, onLogout }) {

  // Lista de itens do menu com id, label e ícone
  // O id precisa bater com os valores usados no App.jsx para trocar de aba
  const menuItems = [
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

  /*
   * Calcula o progresso para o próximo nível.
   * Cada nível exige 100 XP. O % (módulo) nos dá o resto da divisão.
   * Exemplo: usuário com 340 XP → 340 % 100 = 40 → 40% para o próximo nível
   */
  const xpProgress = user.xp % 100;

  return (
    /*
     * Sidebar:
     * - bg-[#1E3A8A] = azul escuro (nossa cor primary-dark)
     * - w-72 = 288px de largura (mais largo que o padrão para melhor legibilidade)
     * - min-h-screen = ocupa toda a altura da tela
     * - flex flex-col justify-between = distribui top e bottom verticalmente
     */
    <aside className="w-72 min-h-screen flex flex-col justify-between shrink-0"
      style={{ background: "var(--color-primary-dark)" }}
    >
      {/* ── Parte de cima: logo + usuário + menu ── */}
      <div className="p-5 space-y-5">

        {/* LOGO */}
        <h1 className="text-2xl font-extrabold tracking-wide py-2">
          <span className="text-white">Edu</span>
          {/* Accent color via CSS var — muda com a paleta selecionada */}
          <span style={{ color: "var(--color-accent)" }}>Finance</span>
        </h1>

        {/* BLOCO DO USUÁRIO */}
        <div
          className="bg-white/10 p-4 rounded-sm space-y-3"
          data-finbot-context={`Painel do usuário ${user.nome}. Nível atual: ${user.nivel}. XP total: ${user.xp}. O XP (pontos de experiência) é ganho ao completar aulas e simulações. A cada 100 XP você sobe de nível.`}
        >
          <div className="flex items-center gap-3">
            {/* Avatar: exibe foto ou inicial do nome */}
            <div className="w-11 h-11 rounded-full bg-[#2563EB] flex items-center justify-center font-extrabold text-lg text-white shrink-0 ring-2 ring-white/20">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
              ) : (
                user.nome.charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm text-white truncate">{user.nome}</p>
              <div className="flex items-center gap-1.5 text-xs text-blue-200 mt-0.5">
                <span className="font-semibold">Nível {user.nivel}</span>
                <span>•</span>
                {/* XP em destaque com a cor de accent da paleta */}
                <span style={{ color: "var(--color-accent)" }} className="font-bold">{user.xp} XP</span>
              </div>
            </div>
          </div>

          {/* BARRA DE PROGRESSO XP */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-blue-200">
              <span>Próximo nível</span>
              <span>{xpProgress}/100 XP</span>
            </div>
            {/* Trilha cinza */}
            <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
              {/* Preenchimento laranja proporcional ao progresso */}
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${xpProgress}%`,
                  background: "var(--color-accent)", // Cor de destaque da paleta
                }}
              />
            </div>
          </div>
        </div>

        {/* MENU DE NAVEGAÇÃO */}
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id; // Verifica se esta aba está ativa

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-sm
                  text-sm font-semibold transition-all duration-150
                  ${active
                    // Aba ativa: fundo da cor primary da paleta + texto branco
                    ? "text-white"
                    // Aba inativa: texto semi-transparente, hover com fundo branco leve
                    : "text-blue-100/70 hover:bg-white/10 hover:text-white"
                  }
                `}
                // Usamos style para poder usar a CSS variable (Tailwind não suporta vars dinâmicas)
                style={active ? { background: "var(--color-primary)" } : {}}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? "text-white" : "text-blue-200/60"}`} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── Parte de baixo: botão Sair ── */}
      <div className="p-4 border-t border-white/10">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-semibold text-blue-100/70 hover:bg-red-900/30 hover:text-red-300 transition"
        >
          <LogOut className="w-4 h-4 text-blue-200/60" />
          Sair
        </button>
      </div>
    </aside>
  );
}
