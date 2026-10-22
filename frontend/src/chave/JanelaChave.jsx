import { useEffect } from "react";
import { X } from "lucide-react";

/**
 * Janela das telas de chave digital. Fica acima das outras janelas do app (z-60),
 * porque o pedido de chave pode aparecer por cima de uma aula ou do Mercado.
 * Com `podeFechar={false}` não fecha pelo X, pelo ESC nem clicando fora.
 */
export default function JanelaChave({ titulo, icone: Icone, onFechar, podeFechar = true, largura = "max-w-md", children }) {
  useEffect(() => {
    if (!podeFechar) return;
    const aoTeclar = (e) => { if (e.key === "Escape") onFechar(); };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [podeFechar, onFechar]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4 animate-fade-in"
      onMouseDown={(e) => { if (podeFechar && e.target === e.currentTarget) onFechar(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className={`bg-white rounded-xl shadow-2xl border border-slate-200 w-full ${largura} max-h-[92dvh] flex flex-col overflow-hidden animate-scale-in`}
      >
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
          <h2 className="text-sm font-extrabold text-slate-800 flex items-center gap-2 min-w-0">
            {Icone && <Icone className="w-4 h-4 shrink-0" style={{ color: "var(--color-primary)" }} />}
            <span className="truncate">{titulo}</span>
          </h2>
          {podeFechar && (
            <button
              type="button"
              onClick={onFechar}
              aria-label="Fechar"
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
