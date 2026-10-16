import { useSyncExternalStore } from "react";

/*
 * O modo escuro é a classe "dark" no <html> (ligada no App.jsx).
 * Quase tudo se adapta por CSS, mas os gráficos da ApexCharts recebem as cores
 * por JavaScript, então precisam saber o tema atual e redesenhar quando ele muda.
 */
function subscribe(callback) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

export function useDarkMode() {
  return useSyncExternalStore(subscribe, () => document.documentElement.classList.contains("dark"));
}

// Cores de texto, grade e tooltip dos gráficos para cada tema
export function chartTheme(dark) {
  return dark
    ? { mode: "dark", text: "#e2e8f0", muted: "#94a3b8", grid: "rgba(148, 163, 184, 0.15)" }
    : { mode: "light", text: "#1e293b", muted: "#94a3b8", grid: "#f1f5f9" };
}
