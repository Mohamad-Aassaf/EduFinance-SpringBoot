/**
 * ui.jsx — Blocos de interface compartilhados entre as páginas
 *
 * - Card:       cartão branco com cabeçalho (título à esquerda, ações à direita)
 * - IconButton: botão circular só com ícone, usado nos cabeçalhos
 * - Avatar:     foto do usuário ou a inicial do nome
 * - EmptyState: mensagem padrão para listas vazias
 *
 * Todos usam as variáveis CSS da paleta (var(--color-primary) etc.),
 * então acompanham a paleta e o modo escuro escolhidos no Perfil.
 */

export function Card({ title, subtitle, icon: Icon, actions, children, className = "", bodyClassName = "", ...rest }) {
  return (
    <section
      className={`bg-white rounded-sm shadow-sm border border-slate-100 flex flex-col min-w-0 ${className}`}
      {...rest}
    >
      {(title || actions) && (
        <header className="flex items-start justify-between gap-3 px-5 pt-5">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 truncate min-h-9">
              {Icon && <Icon className="w-4 h-4 shrink-0" style={{ color: "var(--color-primary)" }} />}
              <span className="truncate">{title}</span>
            </h3>
            {subtitle && <p className="text-xs text-slate-400 font-medium mt-0.5 truncate">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </header>
      )}
      <div className={`p-5 flex-1 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

export function IconButton({ icon: Icon, label, onClick, active = false, className = "", ...rest }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`w-9 h-9 rounded-full flex items-center justify-center border transition shrink-0 focus:outline-none ${
        active
          ? "border-transparent"
          : "bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300"
      } ${className}`}
      style={active ? { background: "var(--color-primary)", color: "var(--color-text-on-primary)" } : undefined}
      {...rest}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

export function Avatar({ nome, avatarUrl, className = "w-9 h-9 text-sm" }) {
  return (
    <div
      className={`rounded-full flex items-center justify-center font-extrabold shrink-0 overflow-hidden ${className}`}
      style={{ background: "var(--color-primary)", color: "var(--color-text-on-primary)" }}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        (nome || "?").charAt(0).toUpperCase()
      )}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-8 px-4 gap-2">
      {Icon && (
        <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center mb-1">
          <Icon className="w-5 h-5 text-slate-400" />
        </div>
      )}
      {title && <p className="text-sm font-bold text-slate-700">{title}</p>}
      {text && <p className="text-xs text-slate-400 font-medium max-w-xs">{text}</p>}
      {action}
    </div>
  );
}

// Classes padrão dos campos de formulário e seus rótulos
export const inputClass =
  "w-full px-3 py-2 border border-slate-200 rounded-sm focus:outline-none text-sm font-semibold bg-white disabled:opacity-60";
export const labelClass = "block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1";

const BUTTON_VARIANTS = {
  secondary: "bg-slate-100 hover:bg-slate-200 text-slate-700",
  outline: "bg-white border hover:opacity-80",
  danger: "bg-red-600 hover:bg-red-700 text-white shadow-md",
  ghost: "text-slate-500 hover:text-slate-800 hover:bg-slate-100",
};

export function Button({ variant = "primary", icon: Icon, children, className = "", type = "button", ...rest }) {
  const style =
    variant === "primary"
      ? { background: "var(--color-primary)", color: "var(--color-text-on-primary)" }
      : variant === "outline"
        ? { color: "var(--color-primary)", borderColor: "var(--color-primary)" }
        : undefined;
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-1.5 font-bold py-2 px-3.5 rounded-sm text-xs transition disabled:opacity-50 disabled:cursor-not-allowed ${
        variant === "primary" ? "shadow-md hover:opacity-90" : BUTTON_VARIANTS[variant]
      } ${className}`}
      style={style}
      {...rest}
    >
      {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
      {children}
    </button>
  );
}

export function Modal({ title, onClose, children, size = "max-w-sm" }) {
  return (
    <div
      className="fixed inset-0 bg-slate-950/40 flex items-center justify-center p-4 z-50 animate-fade-in"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`bg-white rounded-sm ${size} w-full p-6 relative shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold text-lg"
        >
          ✕
        </button>
        <h3 className="text-lg font-bold text-slate-800 pr-8">{title}</h3>
        {children}
      </div>
    </div>
  );
}
