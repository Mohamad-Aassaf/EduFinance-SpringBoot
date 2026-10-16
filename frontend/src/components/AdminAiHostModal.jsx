/**
 * AdminAiHostModal.jsx — Painel do administrador da IA
 *
 * Escolhe em qual servidor Ollama o FinBot roda (PC, Notebook ou outro endereço).
 * A escolha é global: vale para todos os usuários da aplicação e fica salva no banco.
 *
 * Por isso o painel é protegido por senha. A senha é conferida no backend em cada
 * operação (entrar, testar, salvar) e fica só na memória enquanto a janela está aberta.
 */

import { useState, useEffect } from "react";
import { Server, CheckCircle2, AlertCircle, RefreshCw, X, Laptop, Monitor, Globe, Lock, Users } from "lucide-react";
import { api } from "../api";
import { toast } from "../motion";

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

export default function AdminAiHostModal({ isOpen, onClose, onConfigUpdated }) {
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [authError, setAuthError] = useState("");

  const [activeHostMode, setActiveHostMode] = useState("pc");
  const [urls, setUrls] = useState({ pc: "", notebook: "", custom: "" });

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [statusResult, setStatusResult] = useState(null);
  const [message, setMessage] = useState("");

  // Sempre que a janela fecha, a senha é esquecida
  useEffect(() => {
    if (!isOpen) {
      setPassword("");
      setUnlocked(false);
      setAuthError("");
      setStatusResult(null);
      setMessage("");
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
      const cfg = await api.post("/api/finbot/admin/login", { password });
      setActiveHostMode(cfg.activeHostMode || "pc");
      setUrls({ pc: cfg.pcUrl || "", notebook: cfg.notebookUrl || "", custom: cfg.customUrl || "" });
      setUnlocked(true);
    } catch (err) {
      setAuthError(err.message || "Não foi possível entrar.");
    } finally {
      setUnlocking(false);
    }
  }

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

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Painel Admin — Servidor da IA"
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[92dvh] flex flex-col overflow-hidden animate-scale-in"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center gap-3 bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Server className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-extrabold text-slate-800 flex flex-wrap items-center gap-x-2">
                Painel Admin — Servidor da IA
                <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">ADMIN</span>
              </h2>
              <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                <Users className="w-3 h-3 shrink-0" />
                A escolha vale para todos os usuários do EduFinance
              </p>
            </div>
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

        {!unlocked ? (
          /* ── Etapa 1: senha do administrador ── */
          <form onSubmit={handleUnlock} className="p-5 space-y-4">
            <div className="flex flex-col items-center text-center gap-2 py-2">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                <Lock className="w-5 h-5 text-slate-500" />
              </div>
              <p className="text-sm font-bold text-slate-800">Área restrita ao administrador</p>
              <p className="text-xs text-slate-500 max-w-xs">
                Digite a senha de administrador para trocar o servidor onde a IA roda.
              </p>
            </div>
            <div>
              <label htmlFor="admin-ia-senha" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Senha de administrador
              </label>
              <input
                id="admin-ia-senha"
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
          /* ── Etapa 2: escolha do servidor ── */
          <>
            <div className="p-5 space-y-3 text-xs overflow-y-auto flex-1 min-h-0">
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

              {/* Status Connection Box */}
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

            {/* Modal Footer */}
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
        )}
      </div>
    </div>
  );
}
