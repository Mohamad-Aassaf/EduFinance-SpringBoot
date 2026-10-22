/**
 * FinBotInspector — Botão Flutuante "Pergunte ao FinBot"
 *
 * COMO FUNCIONA:
 * ─────────────────────────────────────────────────────────────────
 * 1. Um botão flutuante aparece no canto inferior direito de todas as páginas.
 *
 * 2. Ao clicar nele, o "modo inspeção" é ativado:
 *    - O cursor muda para uma mira (crosshair)
 *    - Um aviso aparece no topo da tela
 *    - Ao passar o mouse sobre qualquer elemento, ele fica destacado com um anel azul
 *
 * 3. O usuário clica em qualquer elemento da página.
 *    - O JavaScript captura o CONTEXTO daquele elemento
 *      (texto visível, ou um atributo data-finbot-context se disponível)
 *    - Enviamos esse contexto para a API do FinBot (Ollama)
 *
 * 4. A resposta do FinBot aparece em um painel deslizante na parte inferior.
 *
 * 5. Pressionar ESC ou clicar no X desativa o modo inspeção.
 *
 * CONCEITOS USADOS:
 * - useState: gerencia o estado do componente (ativo/inativo, resultado, etc.)
 * - useEffect: adiciona/remove event listeners ao ativar/desativar o modo
 * - useRef: referência ao painel para evitar que o inspector "inspecione a si mesmo"
 * - Event Capture (addEventListener com true): intercepta cliques antes dos handlers normais
 */

import { useState, useEffect, useRef } from "react";
import { Bot, X, Loader2, Zap, Eye } from "lucide-react";
import { api } from "../api";
import { isMotionEnabled } from "../motion";

const RAIO_LUZ = 110; // raio (px) do círculo iluminado em volta do mouse

/*
 * Holofote do modo inspeção: escurece a página, deixa um círculo de luz em volta do mouse
 * e desenha o feixe saindo do botão do FinBot até ele.
 * Tudo é atualizado direto no DOM a cada quadro (requestAnimationFrame), sem re-render do React.
 * A luz segue o mouse com um leve atraso, para o movimento parecer de um holofote de verdade.
 */
function Holofote({ buttonRef, iconRef }) {
  const sombraRef = useRef(null);
  const feixeRef = useRef(null);
  const gradienteRef = useRef(null);
  const brilhoRef = useRef(null);

  useEffect(() => {
    // Antes de o mouse se mexer (ou no celular), a luz começa no meio da tela
    const alvo = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const atual = { ...alvo };
    let quadro;

    const aoMover = (e) => {
      alvo.x = e.clientX;
      alvo.y = e.clientY;
    };

    const desenhar = () => {
      const suave = isMotionEnabled() ? 0.18 : 1;
      atual.x += (alvo.x - atual.x) * suave;
      atual.y += (alvo.y - atual.y) * suave;
      const { x, y } = atual;

      sombraRef.current?.style.setProperty("--luz-x", `${x}px`);
      sombraRef.current?.style.setProperty("--luz-y", `${y}px`);

      const botao = buttonRef.current?.getBoundingClientRect();
      if (botao && feixeRef.current) {
        const bx = botao.left + botao.width / 2;
        const by = botao.top + botao.height / 2;
        const dx = x - bx;
        const dy = y - by;
        const dist = Math.hypot(dx, dy) || 1;
        // Vetor perpendicular ao feixe, para abrir o cone
        const px = -dy / dist;
        const py = dx / dist;
        const base = 10;
        const boca = RAIO_LUZ * 0.85;
        feixeRef.current.setAttribute(
          "points",
          [
            `${bx + px * base},${by + py * base}`,
            `${x + px * boca},${y + py * boca}`,
            `${x - px * boca},${y - py * boca}`,
            `${bx - px * base},${by - py * base}`,
          ].join(" ")
        );
        gradienteRef.current?.setAttribute("x1", bx);
        gradienteRef.current?.setAttribute("y1", by);
        gradienteRef.current?.setAttribute("x2", x);
        gradienteRef.current?.setAttribute("y2", y);
        brilhoRef.current?.setAttribute("cx", x);
        brilhoRef.current?.setAttribute("cy", y);

        // O FinBot vira a cabeça na direção da luz (no máximo 30°).
        // Ele fica no canto inferior direito, então "reto" é olhar para cima e à esquerda (-135°).
        const angulo = Math.max(-30, Math.min(30, (Math.atan2(dy, dx) * 180) / Math.PI + 135));
        iconRef.current?.style.setProperty("--olhar", `${angulo}deg`);
      }

      quadro = requestAnimationFrame(desenhar);
    };

    window.addEventListener("pointermove", aoMover, { passive: true });
    quadro = requestAnimationFrame(desenhar);
    return () => {
      window.removeEventListener("pointermove", aoMover);
      cancelAnimationFrame(quadro);
    };
  }, [buttonRef, iconRef]);

  return (
    <div data-finbot-ignore="true" aria-hidden="true" className="fixed inset-0 z-[9990] pointer-events-none holofote-entrada">
      {/* Escuridão com um buraco de luz em volta do mouse */}
      <div ref={sombraRef} className="absolute inset-0 holofote-sombra" style={{ "--luz-raio": `${RAIO_LUZ}px` }} />
      {/* Feixe de luz saindo do FinBot */}
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          <linearGradient id="holofote-feixe" ref={gradienteRef} gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fff7d6" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#fff7d6" stopOpacity="0.08" />
          </linearGradient>
          <radialGradient id="holofote-brilho">
            <stop offset="0%" stopColor="#fffbeb" stopOpacity="0.28" />
            <stop offset="70%" stopColor="#fffbeb" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#fffbeb" stopOpacity="0" />
          </radialGradient>
        </defs>
        <polygon ref={feixeRef} fill="url(#holofote-feixe)" className="holofote-feixe" />
        <circle ref={brilhoRef} r={RAIO_LUZ} fill="url(#holofote-brilho)" />
      </svg>
    </div>
  );
}

export default function FinBotInspector() {
  // ─── ESTADOS ────────────────────────────────────────────────────

  // isInspecting: true quando o modo inspeção está ativo
  const [isInspecting, setIsInspecting] = useState(false);

  // showPanel: true quando o painel de resposta deve ser mostrado
  const [showPanel, setShowPanel] = useState(false);

  // loading: true enquanto aguarda resposta da IA
  const [loading, setLoading] = useState(false);

  // result: texto da resposta da IA
  const [result, setResult] = useState("");

  // targetInfo: descrição do elemento que o usuário clicou
  const [targetInfo, setTargetInfo] = useState("");

  // ─── REFS ───────────────────────────────────────────────────────

  // panelRef: referência ao painel de resultado para não inspecioná-lo
  const panelRef = useRef(null);

  // buttonRef: referência ao botão para não inspecioná-lo
  const buttonRef = useRef(null);

  // iconRef: o rostinho do FinBot, que vira na direção do holofote
  const iconRef = useRef(null);

  // ─── FUNÇÃO: Extrair Contexto do Elemento Clicado ────────────────
  /**
   * Recebe um elemento HTML e retorna uma string descritiva.
   *
   * Ordem de prioridade:
   * 1. Atributo data-finbot-context (colocamos manualmente nos elementos importantes)
   * 2. Texto visível do elemento ou do card pai
   * 3. Texto genérico
   */
  function extrairContexto(elemento) {
    // Sobe na árvore DOM procurando um ancestral com data-finbot-context
    // O método .closest() busca no elemento e em todos os pais
    const elementoComContexto = elemento.closest("[data-finbot-context]");
    if (elementoComContexto) {
      return elementoComContexto.dataset.finbotContext;
    }

    // Tenta pegar o card/seção mais próxima para ter mais contexto
    const card = elemento.closest(
      "article, section, [class*='rounded'], [class*='card'], li, tr"
    );

    const texto = (card || elemento).textContent?.trim() ?? "";

    if (texto.length > 5) {
      // Limita a 200 caracteres para não sobrecarregar o prompt
      return `Elemento da interface EduFinance com o conteúdo: "${texto.slice(0, 200)}"`;
    }

    return "Um elemento da interface da plataforma EduFinance.";
  }

  // ─── FUNÇÃO: Chamar a API do FinBot ──────────────────────────────
  /**
   * Envia o contexto do elemento clicado para o FinBot e exibe a resposta.
   */
  async function perguntarFinBot(contexto) {
    setLoading(true);
    setResult("");
    setShowPanel(true);

    // Monta o prompt que será enviado ao modelo de IA
    // Contexto é incluído para que o FinBot saiba O QUE explicar
    const prompt =
      `O usuário da plataforma EduFinance está aprendendo sobre finanças e clicou para entender o seguinte elemento: ${contexto}. ` +
      `Por favor, explique de forma didática, clara e em português do Brasil o que é isso, ` +
      `como funciona e qual a sua importância no contexto de educação financeira e investimentos. ` +
      `Seja conciso (no máximo 3 parágrafos curtos).`;

    try {
      // Chamamos o endpoint /api/finbot/chat que criamos no backend
      // Usamos llama3.2:1b (modelo mais rápido) para respostas ágeis
      const resposta = await api.post("/api/finbot/chat", {
        model: "llama3.2:1b",
        message: prompt,
        // sessionId: null → cria nova sessão (não poluir histórico com inspeções)
      });
      setResult(resposta.reply);
    } catch (err) {
      setResult(
        "❌ Não consegui explicar agora. Verifique se o Ollama está rodando (`ollama serve`)."
      );
    } finally {
      setLoading(false);
    }
  }

  // ─── EFEITO: Adicionar/Remover Event Listeners ───────────────────
  /**
   * useEffect é executado sempre que `isInspecting` muda.
   *
   * Quando isInspecting = true:  adicionamos os listeners de mouse e teclado
   * Quando isInspecting = false: removemos os listeners (limpeza)
   *
   * O "return" no useEffect é a função de limpeza — o React a chama
   * automaticamente quando o efeito precisa ser desfeito.
   */
  useEffect(() => {
    // Se não está inspecionando, não faz nada
    if (!isInspecting) return;

    // Adiciona classe ao body para mudar o cursor globalmente
    document.body.classList.add("finbot-inspecting");

    // Variável local para controlar o último elemento destacado
    let elementoDestacado = null;

    // ── Handler: mouseover ──
    // Chamado quando o mouse ENTRA em um elemento
    function aoPassarMouse(evento) {
      // Ignora elementos do próprio Inspector (painel e botão)
      if (
        panelRef.current?.contains(evento.target) ||
        buttonRef.current?.contains(evento.target)
      ) {
        return;
      }

      // Remove o destaque do elemento anterior
      if (elementoDestacado) {
        elementoDestacado.classList.remove("finbot-inspect-target");
      }

      // Adiciona destaque ao novo elemento
      elementoDestacado = evento.target;
      elementoDestacado.classList.add("finbot-inspect-target");
    }

    // ── Handler: mouseout ──
    // Chamado quando o mouse SAI de um elemento
    function aoSairMouse(evento) {
      if (elementoDestacado) {
        elementoDestacado.classList.remove("finbot-inspect-target");
        elementoDestacado = null;
      }
    }

    // ── Handler: click ──
    // Chamado quando o usuário clica em um elemento
    // Usamos {capture: true} para interceptar o clique ANTES dos handlers normais
    function aoClicar(evento) {
      // Ignora cliques no próprio Inspector
      if (
        panelRef.current?.contains(evento.target) ||
        buttonRef.current?.contains(evento.target)
      ) {
        return;
      }

      // Previne a ação padrão do elemento clicado (ex: não abre modal, não navega)
      evento.preventDefault();
      evento.stopPropagation();

      // Extrai o contexto do elemento clicado
      const contexto = extrairContexto(evento.target);
      setTargetInfo(contexto.slice(0, 80) + (contexto.length > 80 ? "..." : ""));

      // Desativa o modo inspeção após o clique
      setIsInspecting(false);

      // Remove o destaque visual
      if (elementoDestacado) {
        elementoDestacado.classList.remove("finbot-inspect-target");
        elementoDestacado = null;
      }

      // Pergunta ao FinBot sobre o elemento
      perguntarFinBot(contexto);
    }

    // ── Handler: keydown ──
    // Permite sair do modo inspeção pressionando ESC
    function aoApertarTecla(evento) {
      if (evento.key === "Escape") {
        setIsInspecting(false);
        // Limpa qualquer destaque restante
        document
          .querySelectorAll(".finbot-inspect-target")
          .forEach((el) => el.classList.remove("finbot-inspect-target"));
      }
    }

    // Registra todos os listeners
    // `true` no terceiro parâmetro = "capture phase" (intercepta antes dos outros handlers)
    document.addEventListener("mouseover", aoPassarMouse, true);
    document.addEventListener("mouseout", aoSairMouse, true);
    document.addEventListener("click", aoClicar, true);
    document.addEventListener("keydown", aoApertarTecla);

    // ── Função de limpeza ──
    // O React chama isso quando isInspecting volta a ser false
    return () => {
      document.body.classList.remove("finbot-inspecting");
      document.removeEventListener("mouseover", aoPassarMouse, true);
      document.removeEventListener("mouseout", aoSairMouse, true);
      document.removeEventListener("click", aoClicar, true);
      document.removeEventListener("keydown", aoApertarTecla);
      // Remove qualquer destaque que possa ter ficado
      document
        .querySelectorAll(".finbot-inspect-target")
        .forEach((el) => el.classList.remove("finbot-inspect-target"));
    };
  }, [isInspecting]); // ← O efeito roda novamente sempre que isInspecting mudar

  // ─── RENDERIZAÇÃO ────────────────────────────────────────────────
  return (
    <>
      {/* ── Holofote: a página escurece e a luz do FinBot segue o mouse ── */}
      {isInspecting && <Holofote buttonRef={buttonRef} iconRef={iconRef} />}

      {/* ── Balão do FinBot esperando a escolha ── */}
      {isInspecting && (
        <div
          data-finbot-ignore="true"
          aria-hidden="true"
          className="fixed bottom-[5.25rem] right-6 z-[9998] pointer-events-none holofote-balao
                     bg-white text-slate-700 text-xs font-bold px-3.5 py-2 rounded-xl shadow-xl
                     flex items-center gap-2"
        >
          Estou esperando… escolha algo!
          <span className="holofote-pontinhos">
            <span /><span /><span />
          </span>
        </div>
      )}

      {/* ── Toast de instrução (aparece quando modo inspeção está ativo) ── */}
      {isInspecting && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999]
                     bg-[#1E3A8A] text-white px-5 py-3 rounded-sm shadow-2xl
                     flex items-center gap-3 text-sm font-semibold
                     animate-slide-up"
          data-finbot-ignore="true" // Evita que o inspector inspecione este toast
        >
          <Eye className="w-4 h-4 text-[#F97316]" />
          <span>Clique em qualquer elemento para o FinBot explicar!</span>
          <span className="text-xs text-blue-200 ml-1">(ESC para cancelar)</span>
        </div>
      )}

      {/* ── Botão flutuante principal ─────────────────────────────── */}
      <button
        ref={buttonRef}
        data-finbot-ignore="true"
        onClick={() => {
          if (isInspecting) {
            setIsInspecting(false);
          } else {
            setIsInspecting(true);
            setShowPanel(false);
          }
        }}
        title={isInspecting ? "Cancelar inspeção (ESC)" : "Pergunte ao FinBot sobre qualquer elemento"}
        aria-label={isInspecting ? "Cancelar inspeção" : "Pergunte ao FinBot sobre qualquer elemento"}
        className={`
          fixed bottom-6 right-6 ${isInspecting ? "z-[9998]" : "z-40"}
          w-14 h-14 rounded-full shadow-2xl
          flex items-center justify-center
          transition-all duration-200 active:scale-95
          ${isInspecting ? "holofote-botao" : ""}
        `}
        style={{
          // No modo inspeção: usa accent (laranja por padrão)
          // No modo normal: usa primary (azul por padrão)
          background: isInspecting ? "var(--color-accent)" : "var(--color-primary)",
        }}
      >
        <span ref={iconRef} className={isInspecting ? "holofote-rosto" : "inline-flex"}>
          <Bot className="w-6 h-6 text-white" />
        </span>
        {/* No modo inspeção, um X pequeno mostra que clicar de novo cancela */}
        {isInspecting && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white text-slate-600 shadow flex items-center justify-center">
            <X className="w-3 h-3" />
          </span>
        )}
      </button>

      {/* ── Painel de resultado deslizante ───────────────────────── */}
      {showPanel && (
        <div
          ref={panelRef}
          data-finbot-ignore="true"
          className="fixed bottom-24 right-6 z-[9997] w-96 max-w-[calc(100vw-2rem)]
                     bg-white dark:bg-[#1E2942] rounded-sm shadow-2xl
                     border border-slate-100 dark:border-slate-700/30
                     animate-slide-up overflow-hidden"
        >
          {/* Cabeçalho do painel — usa a cor primary da paleta */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700/30"
            style={{ background: "var(--color-primary)" }}
          >
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-white" />
              <span className="text-sm font-bold text-white">Professor FinBot</span>
            </div>
            <button
              onClick={() => setShowPanel(false)}
              className="text-blue-200 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Contexto do elemento clicado */}
          {targetInfo && (
            <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-900/30">
              <p className="text-[11px] text-blue-700 dark:text-blue-300 font-medium leading-snug">
                🔍 <span className="opacity-70">Explicando:</span> {targetInfo}
              </p>
            </div>
          )}

          {/* Área do conteúdo */}
          <div className="px-4 py-4 max-h-72 overflow-y-auto">
            {loading ? (
              /* Indicador de carregamento */
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <Loader2 className="w-6 h-6 text-[#2563EB] animate-spin" />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  FinBot está analisando...
                </p>
              </div>
            ) : result ? (
              /* Resposta da IA */
              <div
                className="bot-message text-sm leading-relaxed text-slate-700 dark:text-slate-200"
                dangerouslySetInnerHTML={{
                  // Renderiza markdown simples (negrito, listas)
                  __html: result
                    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                    .replace(/\*(.+?)\*/g, "<em>$1</em>")
                    .replace(/^[-•] (.+)$/gm, "<li>$1</li>")
                    .replace(/(<li>[\s\S]*?<\/li>)/g, "<ul>$1</ul>")
                    .replace(/\n\n/g, "<br/><br/>")
                    .replace(/\n/g, "<br/>"),
                }}
              />
            ) : null}
          </div>

          {/* Rodapé */}
          {!loading && result && (
            <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-700/30 flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-[#F97316]" />
              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                Powered by Ollama · llama3.2:1b
              </span>
            </div>
          )}
        </div>
      )}
    </>
  );
}
