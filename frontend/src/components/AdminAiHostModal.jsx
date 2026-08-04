import { useState, useEffect } from "react";
import { Server, CheckCircle2, AlertCircle, RefreshCw, X, Laptop, Monitor } from "lucide-react";
import { api } from "../api";

export default function AdminAiHostModal({ isOpen, onClose, onConfigUpdated }) {
  const [activeHostMode, setActiveHostMode] = useState("pc");
  const [pcUrl, setPcUrl] = useState("http://100.83.132.45:11434");
  const [notebookUrl, setNotebookUrl] = useState("http://localhost:11434");
  const [customUrl, setCustomUrl] = useState("http://localhost:11434");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [statusResult, setStatusResult] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen]);

  async function loadConfig() {
    setLoading(true);
    try {
      const cfg = await api.get("/api/finbot/config");
      setActiveHostMode(cfg.activeHostMode || "pc");
      if (cfg.pcUrl) setPcUrl(cfg.pcUrl);
      if (cfg.notebookUrl) setNotebookUrl(cfg.notebookUrl);
      if (cfg.customUrl) setCustomUrl(cfg.customUrl);
    } catch (err) {
      console.error("Erro ao carregar configuração de IA:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleTestConnection() {
    setTesting(true);
    setStatusResult(null);
    try {
      await api.post("/api/finbot/config", {
        activeHostMode,
        pcUrl,
        notebookUrl,
        customUrl,
      });
      const res = await api.get("/api/finbot/status");
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
        activeHostMode,
        pcUrl,
        notebookUrl,
        customUrl,
      });
      setMessage("Configuração salva com sucesso!");
      if (onConfigUpdated) onConfigUpdated(updated);
      setTimeout(() => {
        setMessage("");
        onClose();
      }, 1000);
    } catch (err) {
      setMessage("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-[#111d2e] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg overflow-hidden animate-scale-in">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/50 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                Painel Admin — Servidor da IA
                <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 rounded-full">
                  ADMIN
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 font-medium">
                Escolha onde a IA Ollama está rodando
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition p-1 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 text-xs">
          {loading ? (
            <div className="py-8 text-center text-slate-400 font-semibold animate-pulse">
              Carregando configurações de IA...
            </div>
          ) : (
            <>
              {/* Opção 1: PC (Tailscale / Remoto) */}
              <label
                onClick={() => setActiveHostMode("pc")}
                className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition ${
                  activeHostMode === "pc"
                    ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 dark:border-indigo-500 ring-2 ring-indigo-500/20"
                    : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                }`}
              >
                <input
                  type="radio"
                  name="hostMode"
                  checked={activeHostMode === "pc"}
                  onChange={() => setActiveHostMode("pc")}
                  className="mt-1 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-800 dark:text-white flex items-center gap-1.5 text-xs">
                      <Monitor className="w-4 h-4 text-indigo-500" /> PC (Tailscale / Remoto)
                    </span>
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">Tailscale / Remoto</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Conecta ao Ollama rodando no PC via rede Tailscale.
                  </p>
                  <input
                    type="text"
                    value={pcUrl}
                    onChange={(e) => setPcUrl(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-2 w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-200 font-mono"
                    placeholder="http://100.83.132.45:11434"
                  />
                </div>
              </label>

              {/* Opção 2: Notebook (Local) */}
              <label
                onClick={() => setActiveHostMode("notebook")}
                className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition ${
                  activeHostMode === "notebook"
                    ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 dark:border-indigo-500 ring-2 ring-indigo-500/20"
                    : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                }`}
              >
                <input
                  type="radio"
                  name="hostMode"
                  checked={activeHostMode === "notebook"}
                  onChange={() => setActiveHostMode("notebook")}
                  className="mt-1 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-800 dark:text-white flex items-center gap-1.5 text-xs">
                      <Laptop className="w-4 h-4 text-emerald-500" /> Notebook (Localhost)
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Local</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Roda o modelo Ollama no próprio Notebook.
                  </p>
                  <input
                    type="text"
                    value={notebookUrl}
                    onChange={(e) => setNotebookUrl(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-2 w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-200 font-mono"
                    placeholder="http://localhost:11434"
                  />
                </div>
              </label>

              {/* Opção 3: Personalizado */}
              <label
                onClick={() => setActiveHostMode("custom")}
                className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition ${
                  activeHostMode === "custom"
                    ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 dark:border-indigo-500 ring-2 ring-indigo-500/20"
                    : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                }`}
              >
                <input
                  type="radio"
                  name="hostMode"
                  checked={activeHostMode === "custom"}
                  onChange={() => setActiveHostMode("custom")}
                  className="mt-1 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-800 dark:text-white flex items-center gap-1.5 text-xs">
                      🌐 Outro IP / Servidor Personalizado
                    </span>
                  </div>
                  <input
                    type="text"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-2 w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-200 font-mono"
                    placeholder="http://192.168.1.100:11434"
                  />
                </div>
              </label>

              {/* Status Connection Box */}
              {statusResult && (
                <div
                  className={`p-3 rounded-xl flex items-center gap-2.5 font-semibold text-xs border ${
                    statusResult.online
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                      : "bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800"
                  }`}
                >
                  {statusResult.online ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  )}
                  <span>{statusResult.message}</span>
                </div>
              )}

              {message && (
                <div className="p-3 bg-blue-50 text-blue-800 border border-blue-200 rounded-xl text-xs text-center font-bold">
                  {message}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing || loading}
            className="px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testing ? "animate-spin" : ""}`} />
            {testing ? "Testando..." : "Testar Conexão"}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Salvar Alterações"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
