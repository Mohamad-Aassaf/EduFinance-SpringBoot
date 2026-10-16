import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Bot, User, Sparkles, ChevronDown, Plus, Trash2, Clock, X, MessageSquare, Server, Lock, Globe, FileText } from "lucide-react";
import { api } from "../api";
import AdminAiHostModal from "./AdminAiHostModal";

// ─── Markdown-like renderer (lightweight) ──────────────────────────────────
function BotMessage({ content }) {
  // Convert basic markdown to HTML
  const html = content
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/^[-•] (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br/>");

  return (
    <div
      className="bot-message text-sm md:text-xs leading-relaxed text-slate-700"
      dangerouslySetInnerHTML={{ __html: `<p>${html}</p>` }}
    />
  );
}

// ─── Modos de conhecimento ──────────────────────────────────────────────────
// Fechado: responde só com a base própria (aulas + arquivos da pasta base-conhecimento)
// Aberto:  o backend busca na web e entrega os resultados ao modelo
const MODES = [
  {
    id: "closed",
    label: "Fechado",
    icon: Lock,
    hint: "Responde só com a base do EduFinance (aulas e documentos).",
    loading: "Consultando a base",
  },
  {
    id: "open",
    label: "Aberto",
    icon: Globe,
    hint: "Busca na web antes de responder. Sua pergunta é enviada a um buscador.",
    loading: "Buscando na web",
  },
];

function ModeToggle({ mode, onChange, disabled }) {
  const current = MODES.find((m) => m.id === mode) || MODES[0];
  return (
    <div
      className="flex flex-col sm:flex-row sm:items-center gap-x-3 gap-y-1 mb-2"
      data-finbot-context="Modo de conhecimento do Professor FinBot. Fechado: a IA responde apenas com a base própria do EduFinance (aulas da trilha e documentos PDF/texto). Aberto: a IA busca informações atuais na web antes de responder e mostra as fontes."
    >
      <div className="flex self-start bg-slate-100 p-0.5 rounded-sm shrink-0" role="radiogroup" aria-label="Modo de conhecimento">
        {MODES.map((m) => {
          const Icon = m.icon;
          const active = m.id === mode;
          return (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onChange(m.id)}
              title={m.hint}
              className={`flex items-center gap-1.5 px-3 py-1.5 sm:py-1 rounded-sm text-xs sm:text-[11px] font-bold transition disabled:opacity-60 ${active
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-700"
                }`}
            >
              <Icon className="w-3 h-3" />
              {m.label}
            </button>
          );
        })}
      </div>
      <span className="text-[10px] text-slate-400 font-medium min-w-0">{current.hint}</span>
    </div>
  );
}

// ─── Fontes usadas na resposta ──────────────────────────────────────────────
// Vêm como lista na resposta do chat e como texto JSON nas mensagens do histórico
function parseSources(sources) {
  if (Array.isArray(sources)) return sources;
  if (!sources) return [];
  try {
    return JSON.parse(sources);
  } catch {
    return [];
  }
}

function hostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function MessageSources({ mode, sources }) {
  if (sources.length === 0) return null;
  const Icon = mode === "open" ? Globe : Lock;
  const chipCls =
    "inline-flex items-center gap-1 max-w-full px-2 py-0.5 rounded-full bg-slate-50 border border-slate-100 text-[10px] font-semibold text-slate-600";
  return (
    <div className="mt-3 pt-2 border-t border-slate-100">
      <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
        <Icon className="w-3 h-3" />
        {mode === "open" ? "Fontes da web" : "Base do EduFinance"}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {sources.map((s, idx) =>
          s.url ? (
            <a
              key={idx}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              title={s.title}
              className={`${chipCls} hover:border-indigo-200 hover:text-indigo-700 transition`}
            >
              <span className="text-slate-400">[{idx + 1}]</span>
              <span className="truncate">{hostname(s.url)}</span>
            </a>
          ) : (
            <span key={idx} className={chipCls} title={s.title}>
              <FileText className="w-3 h-3 shrink-0 text-slate-400" />
              <span className="truncate">{s.title}</span>
            </span>
          )
        )}
      </div>
    </div>
  );
}

// ─── Typing Indicator ──────────────────────────────────────────────────────
function TypingIndicator({ model, mode }) {
  const label = MODES.find((m) => m.id === mode)?.loading;
  return (
    <div className="flex gap-2 md:gap-3 animate-fade-in">
      <div className="hidden sm:flex w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 items-center justify-center shrink-0 border border-indigo-200">
        <Bot className="w-4 h-4" />
      </div>
      <div className="bg-white border border-slate-100 px-4 py-3 rounded-sm rounded-bl-none shadow-sm flex items-center gap-2">
        <div className="flex gap-1 items-center">
          <div className="typing-dot"></div>
          <div className="typing-dot"></div>
          <div className="typing-dot"></div>
        </div>
        <span className="text-xs text-slate-400 font-medium ml-1">{label ? `${label} · ${model}` : model}</span>
      </div>
    </div>
  );
}

// ─── Model Selector Dropdown ────────────────────────────────────────────────
function ModelSelector({ models, selectedModel, onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const current = models.find((m) => m.id === selectedModel) || models[0];

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      {/* Botão que exibe o modelo atual e abre o dropdown */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-sm text-xs font-semibold text-slate-700 hover:border-blue-400 hover:text-blue-700 transition shadow-sm"
        data-finbot-context="Seletor de modelo de IA do Professor FinBot. Permite escolher entre 3 modelos Ollama instalados localmente: llama3.2:1b (mais rápido), mistral:7b (melhor qualidade em português) e gemma4:12b (Google, máxima qualidade). Todos rodam localmente; só o modo Aberto envia a pergunta a um buscador da web."
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
        <span className="truncate max-w-[9rem] sm:max-w-none">{current?.name || selectedModel}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-1.5rem)] bg-white border border-slate-100 rounded-sm shadow-xl z-50 overflow-hidden animate-scale-in">
          <div className="px-4 py-2.5 border-b border-slate-50">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Selecionar Modelo
            </p>
          </div>
          {models.map((m) => (
            <button
              key={m.id}
              onClick={() => { onSelect(m.id); setOpen(false); }}
              className={`w-full text-left px-4 py-3 flex items-start gap-3 transition hover:bg-slate-50 ${m.id === selectedModel ? "bg-blue-50/60" : ""
                }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-bold text-slate-800">{m.name}</span>
                  {m.badge && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">
                      {m.badge}
                    </span>
                  )}
                  {m.id === selectedModel && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">
                      ativo
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-500">{m.description}</p>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">{m.size}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── History Sidebar ────────────────────────────────────────────────────────
function HistorySidebar({ sessions, activeSessionId, onSelectSession, onNewChat, onDeleteSession }) {
  return (
    // No celular vira uma gaveta sobreposta; a partir de md volta a ser coluna lateral
    <div className="absolute inset-y-0 left-0 z-30 w-64 max-w-[85%] shadow-xl md:static md:z-auto md:max-w-none md:shadow-none bg-slate-50 border-r border-slate-100 flex flex-col shrink-0">
      <div className="p-4 border-b border-slate-100">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-sm transition shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          Nova Conversa
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {sessions.length === 0 && (
          <div className="text-center py-8 text-xs text-slate-400 font-medium">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-200" />
            Nenhuma conversa ainda
          </div>
        )}
        {sessions.map((s) => (
          <div
            key={s.id}
            onClick={() => onSelectSession(s.id)}
            className={`group relative flex items-start gap-2 px-3 py-2.5 rounded-sm cursor-pointer transition ${s.id === activeSessionId
              ? "bg-indigo-50 border border-indigo-100"
              : "hover:bg-white border border-transparent hover:border-slate-100"
              }`}
          >
            <Clock className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${s.id === activeSessionId ? "text-indigo-500" : "text-slate-400"}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-semibold truncate ${s.id === activeSessionId ? "text-indigo-700" : "text-slate-700"}`}>
                {s.title}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">{s.model}</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onDeleteSession(s.id); }}
              className="md:opacity-0 md:group-hover:opacity-100 text-slate-400 hover:text-red-500 transition shrink-0"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Quick suggestions ──────────────────────────────────────────────────────
const SUGGESTIONS = [
  "O que é a taxa Selic e como ela afeta meus investimentos?",
  "Quais ações da B3 são boas para iniciantes?",
  "Explique a diferença entre renda fixa e variável",
  "Como diversificar minha carteira com pouco dinheiro?",
];

// ─── Main FinBot Component ─────────────────────────────────────────────────
export default function FinBot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState("llama3.2:1b");
  const [mode, setMode] = useState(() => {
    const saved = localStorage.getItem("edufinance-finbot-mode");
    return MODES.some((m) => m.id === saved) ? saved : "closed";
  });
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  // Histórico começa fechado no celular (lá ele abre como gaveta por cima do chat)
  const isMobile = () => window.matchMedia("(max-width: 767px)").matches;
  const [showHistory, setShowHistory] = useState(() => !isMobile());
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [aiConfig, setAiConfig] = useState(null);
  const chatEndRef = useRef(null);

  // ── Load models, sessions and AI config on mount ─────────────────────────
  useEffect(() => {
    loadModels();
    loadSessions();
    loadAiConfig();
  }, []);

  async function loadAiConfig() {
    try {
      const cfg = await api.get("/api/finbot/config");
      setAiConfig(cfg);
    } catch (err) {
      console.error("Erro ao carregar config de IA:", err);
    }
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    localStorage.setItem("edufinance-finbot-mode", mode);
  }, [mode]);

  async function loadModels() {
    try {
      const data = await api.get("/api/finbot/models");
      setModels(data);
      if (data.length > 0) setSelectedModel(data[0].id);
    } catch (err) {
      console.error("Erro ao carregar modelos:", err);
      // Fallback list so UI doesn't break
      setModels([
        { id: "llama3.2:1b", name: "Llama 3.2 1B", size: "1.3 GB", description: "Mais rápido", badge: "⚡ Rápido" },
        { id: "mistral:7b", name: "Mistral 7B", size: "4.4 GB", description: "Melhor PT-BR", badge: "🌟 Recomendado" },
        { id: "gemma4:12b", name: "Gemma 4 12B", size: "7.6 GB", description: "Google avançado", badge: "🔬 Avançado" },
      ]);
    }
  }

  async function loadSessions() {
    try {
      const data = await api.get("/api/finbot/history");
      setSessions(data);
    } catch (err) {
      console.error("Erro ao carregar histórico:", err);
    }
  }

  async function loadSessionMessages(sessionId) {
    try {
      const msgs = await api.get(`/api/finbot/history/${sessionId}/messages`);
      setMessages(msgs.map((m) => ({
        role: m.role,
        content: m.content,
        mode: m.mode,
        sources: parseSources(m.sources),
      })));
      setActiveSessionId(sessionId);
    } catch (err) {
      console.error("Erro ao carregar mensagens:", err);
    }
  }

  function handleSelectSession(sessionId) {
    if (isMobile()) setShowHistory(false);
    loadSessionMessages(sessionId);
  }

  function handleNewChat() {
    setMessages([]);
    setActiveSessionId(null);
    if (isMobile()) setShowHistory(false);
  }

  async function handleDeleteSession(sessionId) {
    try {
      await api.delete(`/api/finbot/history/${sessionId}`);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSessionId === sessionId) handleNewChat();
    } catch (err) {
      console.error("Erro ao excluir sessão:", err);
    }
  }

  const handleSend = useCallback(async (text) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setIsLoading(true);

    try {
      const result = await api.post("/api/finbot/chat", {
        sessionId: activeSessionId,
        model: selectedModel,
        message: trimmed,
        mode,
      });

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: result.reply, mode: result.mode, sources: parseSources(result.sources) },
      ]);

      // Update active session
      if (!activeSessionId) {
        setActiveSessionId(result.sessionId);
        // Reload sessions list to show new entry
        loadSessions();
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `❌ Erro ao processar sua pergunta: ${err.message}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, activeSessionId, selectedModel, mode]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };

  return (
    <div className="relative flex h-full animate-fade-in">
      {/* Fundo escurecido da gaveta (só no celular) */}
      {showHistory && (
        <div
          className="absolute inset-0 z-20 bg-slate-900/40 md:hidden"
          onClick={() => setShowHistory(false)}
        />
      )}

      {/* History Sidebar */}
      {showHistory && (
        <HistorySidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={handleSelectSession}
          onNewChat={handleNewChat}
          onDeleteSession={handleDeleteSession}
        />
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="bg-white border-b border-slate-100 px-3 md:px-6 py-2.5 md:py-4 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <button
              onClick={() => setShowHistory((v) => !v)}
              className="w-9 h-9 -ml-1.5 rounded-full flex items-center justify-center shrink-0 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              title="Mostrar/Ocultar Histórico"
              aria-label="Mostrar ou ocultar o histórico de conversas"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 truncate">
                <Bot className="w-4 h-4 text-indigo-500 shrink-0" />
                Conversa
              </h2>
              <p className="hidden md:block text-xs text-slate-400 font-medium">
                Pergunte qualquer coisa sobre investimentos!
              </p>
            </div>
          </div>

          {/* Model Selector & Admin AI Host Button */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowAdminModal(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-sm text-xs font-bold transition shadow-sm"
              title="Configurar Servidor IA (PC vs Notebook)"
            >
              <Server className="w-3.5 h-3.5 text-indigo-500" />
              <span>IA: {aiConfig?.activeHostMode === "pc" ? "PC" : aiConfig?.activeHostMode === "notebook" ? "Notebook" : "Custom"}</span>
              <span className="hidden md:inline text-[9px] font-extrabold px-1.5 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 rounded-full">
                ADMIN
              </span>
            </button>

            {models.length > 0 && (
              <ModelSelector
                models={models}
                selectedModel={selectedModel}
                onSelect={setSelectedModel}
              />
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3 md:p-6 space-y-4">
          {messages.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center min-h-full text-center space-y-6 max-w-lg mx-auto py-2 md:py-16 animate-fade-in">
              <div className="w-16 h-16 bg-indigo-50 rounded-sm flex items-center justify-center text-indigo-500 shadow-sm border border-indigo-100">
                <Sparkles className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-extrabold text-slate-800">Olá! Sou o Professor FinBot 🎓</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Posso te ajudar a entender finanças, recomendar ações com base em dados e tirar qualquer dúvida sobre investimentos.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                {SUGGESTIONS.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(s)}
                    className="text-left text-xs font-semibold p-3.5 border border-slate-100 hover:border-indigo-200 rounded-sm hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 transition"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, idx) => {
              const isBot = m.role === "assistant";
              return (
                <div key={idx} className={`flex gap-2 md:gap-3 animate-fade-in ${!isBot ? "justify-end" : ""}`}>
                  {isBot && (
                    <div className="hidden sm:flex w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 items-center justify-center shrink-0 border border-indigo-200">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}
                  <div
                    className={`min-w-0 max-w-[92%] sm:max-w-[78%] rounded-sm px-3.5 md:px-4 py-3 break-words ${!isBot
                      ? "bg-indigo-600 text-white text-sm md:text-xs font-semibold rounded-br-none shadow-sm"
                      : "bg-white border border-slate-100 rounded-bl-none shadow-sm"
                      }`}
                  >
                    {isBot ? <BotMessage content={m.content} /> : m.content}
                    {isBot && <MessageSources mode={m.mode} sources={m.sources || []} />}
                  </div>
                  {!isBot && (
                    <div className="hidden sm:flex w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 items-center justify-center shrink-0 border border-emerald-200">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })
          )}

          {isLoading && <TypingIndicator model={selectedModel} mode={mode} />}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div className="bg-white border-t border-slate-100 px-3 md:px-6 py-3 md:py-4 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <ModeToggle mode={mode} onChange={setMode} disabled={isLoading} />
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
            className="flex gap-2"
          >
            <input
              type="text"
              placeholder="Pergunte sobre finanças..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              className="flex-1 min-w-0 px-4 py-2.5 border border-slate-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 text-xs font-medium text-slate-800 placeholder:text-slate-400 bg-slate-50 transition"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              aria-label="Enviar mensagem"
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white px-3.5 rounded-sm transition shadow-sm shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      <AdminAiHostModal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        onConfigUpdated={(cfg) => setAiConfig(cfg)}
      />
    </div>
  );
}
