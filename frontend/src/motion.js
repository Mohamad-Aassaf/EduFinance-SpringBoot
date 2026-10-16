import { useEffect, useRef, useState, useSyncExternalStore } from "react";

/*
 * Microinterações (animações de resposta, confete, vibração no celular).
 *
 * A preferência fica no navegador (localStorage) e vira a classe "no-motion" no <html>:
 * - o CSS desliga animações e transições quando a classe está presente (ver index.css);
 * - o JavaScript consulta isMotionEnabled() antes de animar números, soltar confete ou vibrar.
 *
 * Quem já pediu menos movimento no sistema operacional começa com elas desligadas.
 */
const STORAGE_KEY = "edufinance-motion";

function initialValue() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "on" || saved === "off") return saved === "on";
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

document.documentElement.classList.toggle("no-motion", !initialValue());

export function isMotionEnabled() {
  return !document.documentElement.classList.contains("no-motion");
}

export function setMotionEnabled(enabled) {
  localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off");
  document.documentElement.classList.toggle("no-motion", !enabled);
}

function subscribeToHtmlClass(callback) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

export function useMotionEnabled() {
  return useSyncExternalStore(subscribeToHtmlClass, isMotionEnabled);
}

// Vibração curta no celular (navegadores sem suporte simplesmente ignoram)
export function haptic(pattern = 12) {
  if (isMotionEnabled() && navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // alguns navegadores bloqueiam a vibração fora de um gesto do usuário
    }
  }
}

// ─── Avisos rápidos (toasts) ────────────────────────────────────────────────
// Qualquer componente chama toast("mensagem"); o <Toaster /> do App.jsx exibe.
const toastListeners = new Set();
let toastId = 0;

export function toast(message, type = "success") {
  const item = { id: ++toastId, message, type };
  toastListeners.forEach((listener) => listener(item));
  haptic(type === "error" ? [20, 40, 20] : 12);
}

export function onToast(listener) {
  toastListeners.add(listener);
  return () => toastListeners.delete(listener);
}

// ─── Número que "conta" até o novo valor ────────────────────────────────────
export function useCountUp(value, duration = 600) {
  const [shown, setShown] = useState(value);
  const previous = useRef(value);

  useEffect(() => {
    const from = previous.current;
    previous.current = value;
    if (from === value || !isMotionEnabled()) {
      setShown(value);
      return;
    }

    let frame;
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // desacelera no fim
      setShown(from + (value - from) * eased);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return shown;
}
