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
import { Bot, X, Loader2, Zap, Eye, EyeOff } from "lucide-react";
import { api } from "../api";

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
        title={isInspecting ? "Cancelar inspecção (ESC)" : "Pergunte ao FinBot sobre qualquer elemento"}
        className={`
          fixed bottom-6 right-6 z-[9998]
          w-14 h-14 rounded-full shadow-2xl
          flex items-center justify-center
          transition-all duration-200 active:scale-95
        `}
        style={{
          // No modo inspeção: usa accent (laranja por padrão)
          // No modo normal: usa primary (azul por padrão)
          background: isInspecting ? "var(--color-accent)" : "var(--color-primary)",
        }}
      >
        {isInspecting ? (
          <EyeOff className="w-6 h-6 text-white" />
        ) : (
          <Bot className="w-6 h-6 text-white" />
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
