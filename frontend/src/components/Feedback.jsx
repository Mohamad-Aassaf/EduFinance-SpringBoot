/**
 * Feedback.jsx — Peças visuais de resposta ao usuário
 *
 * - Toaster:        avisos rápidos no topo da tela (disparados por toast() de motion.js)
 * - Confetti:       chuva de confete para comemorações (aula concluída)
 * - AnimatedNumber: número que conta até o novo valor (XP e saldo do cabeçalho)
 */

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";
import { onToast, useCountUp, useMotionEnabled } from "../motion";

const TOAST_STYLES = {
  success: { icon: CheckCircle2, color: "#10b981" },
  error: { icon: AlertCircle, color: "#ef4444" },
  info: { icon: Info, color: "var(--color-primary)" },
};

export function Toaster() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    return onToast((item) => {
      setItems((prev) => [...prev.slice(-2), item]); // no máximo 3 na tela
      setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== item.id)), 3200);
    });
  }, []);

  return (
    <div
      className="fixed top-4 inset-x-0 z-[9990] flex flex-col items-center gap-2 px-4 pointer-events-none"
      role="status"
      aria-live="polite"
      data-finbot-ignore="true"
    >
      {items.map((item) => {
        const { icon: Icon, color } = TOAST_STYLES[item.type] || TOAST_STYLES.info;
        return (
          <div
            key={item.id}
            className="mi-toast pointer-events-auto max-w-sm w-fit bg-white border border-slate-100 shadow-xl rounded-full pl-3 pr-4 py-2 flex items-center gap-2 text-xs font-bold text-slate-800"
          >
            <Icon className="w-4 h-4 shrink-0" style={{ color }} />
            <span className="min-w-0">{item.message}</span>
          </div>
        );
      })}
    </div>
  );
}

const CONFETTI_COLORS = ["#2563EB", "#F97316", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export function Confetti({ pieces = 36 }) {
  const enabled = useMotionEnabled();

  // Posição, atraso e giro de cada pedaço são sorteados uma única vez
  const items = useMemo(
    () =>
      Array.from({ length: pieces }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.35,
        duration: 1.4 + Math.random() * 1.1,
        drift: (Math.random() - 0.5) * 160,
        rotate: 360 + Math.random() * 540,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        round: i % 3 === 0,
      })),
    [pieces]
  );

  if (!enabled) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {items.map((p, i) => (
        <span
          key={i}
          className="mi-confetti"
          style={{
            left: `${p.left}%`,
            background: p.color,
            borderRadius: p.round ? "50%" : "1px",
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            "--mi-drift": `${p.drift}px`,
            "--mi-rotate": `${p.rotate}deg`,
          }}
        />
      ))}
    </div>
  );
}

export function AnimatedNumber({ value, format = (v) => Math.round(v).toLocaleString("pt-BR") }) {
  const shown = useCountUp(value);
  return <>{format(shown)}</>;
}
