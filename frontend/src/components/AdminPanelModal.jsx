/**
 * AdminPanelModal.jsx — Painel do administrador
 *
 * Protegido pela senha de administrador, que o backend confere em cada operação
 * e que fica só na memória enquanto a janela está aberta. Depois de entrar, três abas:
 * - Servidor da IA: em qual servidor Ollama o FinBot roda (vale para todos os usuários)
 * - Saldo virtual: define o saldo da conta logada, para testes no Mercado
 * - Trilha: zera o progresso da trilha de aprendizado da conta logada
 */

import { useState, useEffect } from "react";
import {
  Server, CheckCircle2, AlertCircle, RefreshCw, X, Laptop, Monitor, Globe, Lock, Users,
  Wallet, Route, RotateCcw, ShieldCheck,
} from "lucide-react";
import { api } from "../api";
import { toast } from "../motion";
import { Button, inputClass, labelClass } from "./ui";

const SALDO_INICIAL = 100000;

const HOSTS = [
  {
    id: "pc",
    label: "PC (Tailscale / Remoto)",
    description: "Conecta ao Ollama rodando no PC via rede Tailscale.",
    icon: Monitor,
    placeholder: "http://100.83.132.45:11434",
  },
  {
    id: "notebook",
    label: "Notebook (Localhost)",
    description: "Roda o modelo Ollama no próprio Notebook.",
    icon: Laptop,
    placeholder: "http://localhost:11434",
  },
  {
    id: "custom",
    label: "Outro IP / Servidor Personalizado",
    description: "Qualquer outro servidor Ollama acessível pelo backend.",
    icon: Globe,
    placeholder: "http://192.168.1.100:11434",
  },
];

const ABAS = [
  { id: "ia", label: "Servidor da IA", icon: Server },
  { id: "saldo", label: "Saldo virtual", icon: Wallet },
  { id: "trilha", label: "Trilha", icon: Route },
];

const formatarReais = (v) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

// ─── Aba: servidor da IA ───────────────────────────────────────────────────
function AbaServidorIa({ password, configInicial, onClose, onConfigUpdated }) {
  const [activeHostMode, setActiveHostMode] = useState(configInicial.activeHostMode || "pc");
  const [urls, setUrls] = useState({
    pc: configInicial.pcUrl || "",
    notebook: configInicial.notebookUrl || "",
    custom: configInicial.customUrl || "",
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [statusResult, setStatusResult] = useState(null);
  const [message, setMessage] = useState("");

  // Testa o endereço selecionado sem trocar o servidor em uso pelos outros usuários
  async function handleTestConnection() {
    setTesting(true);
    setStatusResult(null);
    try {
      const res = await api.post("/api/finbot/admin/test", { password, activeHostMode, url: urls[activeHostMode] });
      setStatusResult(res);
    } catch (err) {
      setStatusResult({ online: false, message: "Erro ao testar conexão: " + err.message });
    } finally {
      setTesting(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setMessage("");
    try {
      const updated = await api.post("/api/finbot/config", {
        password,
        activeHostMode,
        pcUrl: urls.pc,
        notebookUrl: urls.notebook,
        customUrl: urls.custom,
      });
      if (onConfigUpdated) onConfigUpdated(updated);
      toast("Servidor da IA atualizado para todos os usuários.");
      onClose();
    } catch (err) {
      setMessage("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="p-5 space-y-3 text-xs overflow-y-auto flex-1 min-h-0">
        <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
          <Users className="w-3 h-3 shrink-0" />
          A escolha vale para todos os usuários do EduFinance
        </p>
        {HOSTS.map((host) => {
          const Icon = host.icon;
          const active = activeHostMode === host.id;
          return (
            <label
              key={host.id}
              className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition ${
                active ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <input
                type="radio"
                name="hostMode"
                checked={active}
                onChange={() => { setActiveHostMode(host.id); setStatusResult(null); }}
                className="mt-1"
              />
              <div className="flex-1 min-w-0">
                <span className="font-extrabold text-slate-800 flex items-center gap-1.5 text-xs">
                  <Icon className="w-4 h-4 text-indigo-500 shrink-0" /> {host.label}
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">{host.description}</p>
                <input
                  type="text"
                  value={urls[host.id]}
                  onChange={(e) => setUrls((prev) => ({ ...prev, [host.id]: e.target.value }))}
                  aria-label={`Endereço: ${host.label}`}
                  className="mt-2 w-full px-3 py-1.5 bg-white border border-slate-200 rounded-sm text-xs text-slate-700 font-mono"
                  placeholder={host.placeholder}
                />
              </div>
            </label>
          );
        })}

        {statusResult && (
          <div
            role="status"
            className={`p-3 rounded-lg flex items-center gap-2.5 font-semibold text-xs border mi-pop ${
              statusResult.online
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-red-50 text-red-800 border-red-200"
            }`}
          >
            {statusResult.online ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            )}
            <span className="min-w-0 break-words">{statusResult.message}</span>
          </div>
        )}

        {message && (
          <div role="alert" className="p-3 bg-red-50 text-red-800 border border-red-200 rounded-lg text-xs text-center font-bold">
            {message}
          </div>
        )}
      </div>

      <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex flex-wrap justify-between items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={handleTestConnection}
          disabled={testing}
          className="px-3.5 py-2 bg-white border border-slate-200 rounded-sm text-xs font-bold text-slate-700 hover:border-slate-300 transition flex items-center gap-1.5 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${testing ? "animate-spin" : ""}`} />
          {testing ? "Testando..." : "Testar Conexão"}
        </button>
        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-sm text-xs font-bold text-slate-500 hover:text-slate-700 transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-sm text-xs font-bold transition shadow-sm disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Salvar para todos"}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Aba: saldo virtual ────────────────────────────────────────────────────
function AbaSaldo({ password, user, onUpdateUser }) {
  const [valor, setValor] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function definir(novoValor) {
    setSaving(true);
    setError("");
    try {
      const perfil = await api.put("/api/admin/me/saldo", { password, valor: novoValor });
      onUpdateUser?.(perfil);
      setValor("");
      toast(`Saldo virtual definido em ${formatarReais(perfil.saldoVirtual)}.`);
    } catch (err) {
      setError(err.message || "Não foi possível alterar o saldo.");
    } finally {
      setSaving(false);
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    definir(parseFloat(valor));
  };

  return (
    <div className="p-5 space-y-4 overflow-y-auto flex-1 min-h-0">
      <p className="text-xs text-slate-500 leading-relaxed">
        Saldo atual: <strong className="text-slate-800">{user ? formatarReais(user.saldoVirtual) : "—"}</strong>.
        O novo valor substitui o saldo disponível; as ações da carteira não mudam. O ranking por saldo passa a usar o
        novo valor.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row sm:items-end gap-2">
        <div className="flex-1 min-w-0">
          <label htmlFor="admin-saldo" className={labelClass}>Novo saldo (R$)</label>
          <input
            id="admin-saldo"
            type="number"
            required
            min="0"
            max="1000000000"
            step="0.01"
            placeholder="Ex: 50000"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            className={inputClass}
          />
        </div>
        <Button type="submit" disabled={saving || valor === ""} className="py-2.5">
          Definir saldo
        </Button>
        <Button
          variant="secondary"
          icon={RefreshCw}
          disabled={saving || user?.saldoVirtual === SALDO_INICIAL}
          onClick={() => definir(SALDO_INICIAL)}
          className="py-2.5"
        >
          Voltar a R$ 100.000
        </Button>
      </form>

      {error && <p role="alert" className="text-xs font-bold text-red-700">{error}</p>}
    </div>
  );
}

// ─── Aba: trilha ───────────────────────────────────────────────────────────
function AbaTrilha({ password, onUpdateUser, onTrilhaResetada }) {
  const [confirmando, setConfirmando] = useState(false);
  const [resetando, setResetando] = useState(false);
  const [error, setError] = useState("");

  async function resetar() {
    setResetando(true);
    setError("");
    try {
      const perfil = await api.post("/api/admin/me/trilha/reset", { password });
      onUpdateUser?.(perfil);
      onTrilhaResetada?.();
      setConfirmando(false);
      toast("Progresso da trilha zerado.");
    } catch (err) {
      setError(err.message || "Não foi possível resetar a trilha.");
    } finally {
      setResetando(false);
    }
  }

  return (
    <div className="p-5 space-y-4 overflow-y-auto flex-1 min-h-0">
      <p className="text-xs text-slate-500 leading-relaxed">
        Volta a trilha de aprendizado da sua conta ao começo: todas as aulas ficam como não concluídas, o XP que elas
        renderam é descontado e as medalhas <strong>Primeira Aula</strong> e <strong>Mestre das Finanças</strong> são
        removidas. Saldo, carteira e ofensiva não mudam.
      </p>

      {!confirmando ? (
        <Button variant="danger" icon={RotateCcw} onClick={() => setConfirmando(true)} className="py-2.5">
          Resetar progresso da trilha
        </Button>
      ) : (
        <div role="alertdialog" aria-label="Confirmar reset da trilha" className="p-4 rounded-lg border border-red-200 bg-red-50 space-y-3 mi-pop">
          <p className="text-xs font-bold text-red-800">Tem certeza? Essa ação não pode ser desfeita.</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="danger" icon={RotateCcw} disabled={resetando} onClick={resetar}>
              {resetando ? "Resetando..." : "Sim, resetar"}
            </Button>
            <Button variant="ghost" disabled={resetando} onClick={() => setConfirmando(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {error && <p role="alert" className="text-xs font-bold text-red-700">{error}</p>}
    </div>
  );
}

// ─── Painel ────────────────────────────────────────────────────────────────
export default function AdminPanelModal({ isOpen, onClose, onConfigUpdated, user, onUpdateUser, onTrilhaResetada }) {
  const [password, setPassword] = useState("");
  const [configIa, setConfigIa] = useState(null); // preenchida ao entrar com a senha certa
  const [unlocking, setUnlocking] = useState(false);
  const [authError, setAuthError] = useState("");
  const [aba, setAba] = useState("ia");

  // Sempre que a janela fecha, a senha é esquecida
  useEffect(() => {
    if (!isOpen) {
      setPassword("");
      setConfigIa(null);
      setAuthError("");
      setAba("ia");
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  async function handleUnlock(e) {
    e.preventDefault();
    setUnlocking(true);
    setAuthError("");
    try {
      setConfigIa(await api.post("/api/finbot/admin/login", { password }));
    } catch (err) {
      setAuthError(err.message || "Não foi possível entrar.");
    } finally {
      setUnlocking(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Painel do administrador"
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[92dvh] flex flex-col overflow-hidden animate-scale-in"
      >
        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center gap-3 bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-extrabold text-slate-800 flex flex-wrap items-center gap-x-2">
              Painel do administrador
              <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">ADMIN</span>
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!configIa ? (
          /* ── Etapa 1: senha do administrador ── */
          <form onSubmit={handleUnlock} className="p-5 space-y-4">
            <div className="flex flex-col items-center text-center gap-2 py-2">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                <Lock className="w-5 h-5 text-slate-500" />
              </div>
              <p className="text-sm font-bold text-slate-800">Área restrita ao administrador</p>
              <p className="text-xs text-slate-500 max-w-xs">
                Digite a senha de administrador para trocar o servidor da IA, ajustar o saldo virtual ou resetar a trilha.
              </p>
            </div>
            <div>
              <label htmlFor="admin-senha" className={labelClass}>Senha de administrador</label>
              <input
                id="admin-senha"
                type="password"
                autoFocus
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full px-3 py-2 border rounded-sm focus:outline-none text-sm font-semibold bg-white ${authError ? "border-red-500 mi-shake" : "border-slate-200"}`}
              />
              {authError && (
                <p role="alert" className="text-xs font-bold text-red-700 mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {authError}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-sm text-xs font-bold text-slate-500 hover:text-slate-700 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={unlocking || !password}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-sm text-xs font-bold transition shadow-sm disabled:opacity-50"
              >
                {unlocking ? "Verificando..." : "Entrar"}
              </button>
            </div>
          </form>
        ) : (
          /* ── Etapa 2: ferramentas ── */
          <>
            <div role="tablist" aria-label="Ferramentas do administrador" className="flex border-b border-slate-100 shrink-0 overflow-x-auto">
              {ABAS.map(({ id, label, icon: Icon }) => {
                const ativa = aba === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={ativa}
                    onClick={() => setAba(id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-bold whitespace-nowrap border-b-2 -mb-px transition ${
                      ativa ? "border-indigo-500 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                );
              })}
            </div>

            {aba === "ia" && (
              <AbaServidorIa password={password} configInicial={configIa} onClose={onClose} onConfigUpdated={onConfigUpdated} />
            )}
            {aba === "saldo" && <AbaSaldo password={password} user={user} onUpdateUser={onUpdateUser} />}
            {aba === "trilha" && (
              <AbaTrilha password={password} onUpdateUser={onUpdateUser} onTrilhaResetada={onTrilhaResetada} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
