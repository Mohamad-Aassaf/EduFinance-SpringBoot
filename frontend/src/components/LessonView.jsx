/**
 * LessonView.jsx — Janela da aula e do quiz
 *
 * Tem três etapas:
 * 1. Aula:      o conteúdo e o exemplo prático
 * 2. Quiz:      uma pergunta por vez, com correção na hora e explicação
 * 3. Resultado: XP ganho, acertos de primeira e medalhas desbloqueadas
 *
 * A aula só é concluída no backend depois que todas as perguntas são
 * respondidas corretamente. Errar não encerra o quiz: dá para tentar de novo.
 */

import { useState, useEffect } from "react";
import {
  X, BookOpen, Lightbulb, CheckCircle2, XCircle, ArrowRight, ArrowLeft, RotateCcw, Trophy, Award,
} from "lucide-react";
import { api } from "../api";
import { Button } from "./ui";
import { Confetti } from "./Feedback";
import { haptic } from "../motion";

const LETTERS = ["A", "B", "C", "D"];

function optionsOf(question) {
  return [question.opcaoA, question.opcaoB, question.opcaoC, question.opcaoD].map((text, idx) => ({
    key: idx + 1, // respostaCorreta vem do backend numerada de 1 a 4
    letter: LETTERS[idx],
    text,
  }));
}

// Alternativa do quiz: muda de aparência conforme selecionada, certa ou errada
function QuizOption({ option, selected, answered, correctKey, onSelect }) {
  const isCorrect = answered && option.key === correctKey;
  const isWrong = answered && selected && option.key !== correctKey;

  let box = "border-slate-200 hover:border-slate-300 text-slate-700";
  let badge = "bg-slate-100 text-slate-500";
  let style;
  let badgeStyle;

  if (isCorrect) {
    box = "border-emerald-200 bg-emerald-50 text-emerald-800 mi-pop";
    badge = "bg-emerald-500 text-white";
  } else if (isWrong) {
    box = "border-red-200 bg-red-50 text-red-800 mi-shake";
    badge = "bg-red-600 text-white";
  } else if (answered) {
    box = "border-slate-100 text-slate-400";
  } else if (selected) {
    box = "text-slate-800";
    style = {
      borderColor: "var(--color-primary)",
      background: "color-mix(in srgb, var(--color-primary) 10%, transparent)",
    };
    badge = "";
    badgeStyle = { background: "var(--color-primary)", color: "var(--color-text-on-primary)" };
  }

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={answered}
      onClick={() => onSelect(option.key)}
      className={`w-full flex items-center gap-3 text-left p-3 rounded-sm border-2 text-sm font-semibold transition disabled:cursor-default ${box}`}
      style={style}
    >
      <span
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-extrabold ${badge}`}
        style={badgeStyle}
      >
        {isCorrect ? <CheckCircle2 className="w-4 h-4" /> : isWrong ? <XCircle className="w-4 h-4" /> : option.letter}
      </span>
      <span className="min-w-0 break-words">{option.text}</span>
    </button>
  );
}

export default function LessonView({ lesson, user, alreadyCompleted = false, onClose, onCompleted }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState("lesson"); // "lesson" | "quiz" | "result"
  const [current, setCurrent] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [missed, setMissed] = useState(() => new Set()); // perguntas erradas ao menos uma vez
  const [finishing, setFinishing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  // Busca as perguntas da lição ativa
  useEffect(() => {
    async function loadQuestions() {
      try {
        const data = await api.get(`/api/perguntas/licao/${lesson.id}`);
        setQuestions(data);
      } catch (err) {
        console.error("Erro ao carregar perguntas:", err);
      } finally {
        setLoading(false);
      }
    }
    loadQuestions();
  }, [lesson.id]);

  // Esc fecha a janela
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const question = questions[current];
  const isCorrect = answered && question && selectedOption === question.respostaCorreta;
  const isLast = current === questions.length - 1;
  const progress = questions.length > 0 ? ((current + (isCorrect ? 1 : 0)) / questions.length) * 100 : 0;

  const handleConfirm = () => {
    if (selectedOption === null) return;
    setAnswered(true);
    if (selectedOption !== question.respostaCorreta) {
      setMissed((prev) => new Set(prev).add(current));
      haptic([20, 40, 20]);
    } else {
      haptic(15);
    }
  };

  const handleRetry = () => {
    setSelectedOption(null);
    setAnswered(false);
  };

  // Envia a conclusão da lição para o backend Spring Boot
  const finishLesson = async () => {
    setFinishing(true);
    setError("");
    try {
      const response = await api.post(`/api/licoes/${lesson.id}/concluir?usuarioId=${user.id}`);
      setResult(response);
      setStep("result");
      onCompleted(response.perfil);
    } catch (err) {
      console.error("Erro ao concluir lição:", err);
      setError("Não foi possível registrar a conclusão da aula. Tente novamente.");
    } finally {
      setFinishing(false);
    }
  };

  const handleNext = () => {
    if (isLast) {
      finishLesson();
      return;
    }
    setCurrent((c) => c + 1);
    setSelectedOption(null);
    setAnswered(false);
  };

  const firstTry = questions.length - missed.size;

  return (
    <div
      className="fixed inset-0 bg-slate-950/50 flex items-end sm:items-center justify-center sm:p-4 z-50 animate-fade-in"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={lesson.titulo}
        className="relative overflow-hidden bg-white w-full sm:max-w-2xl max-h-[92dvh] sm:max-h-[90vh] flex flex-col rounded-t-xl sm:rounded-sm shadow-2xl border border-slate-100"
      >
        {/* Comemoração na primeira conclusão da aula */}
        {step === "result" && result?.xpGanho > 0 && <Confetti />}

        {/* Cabeçalho */}
        <header className="px-5 pt-5 pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full">
                  {lesson.modulo}
                </span>
                {alreadyCompleted && step !== "result" && (
                  <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                    Revisão
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-800 mt-2 leading-snug">{lesson.titulo}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Progresso do quiz */}
          {step === "quiz" && questions.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                <span>Pergunta {current + 1} de {questions.length}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${progress}%`, background: "var(--color-primary)" }}
                />
              </div>
            </div>
          )}
        </header>

        {/* Corpo */}
        <div className="px-5 py-5 overflow-y-auto flex-1 min-h-0">
          {step === "lesson" && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{lesson.conteudo}</p>
              {lesson.exemplo && (
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-sm flex gap-3">
                  <Lightbulb className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-emerald-800 mb-1">Exemplo prático</p>
                    <p className="text-sm text-emerald-700 leading-relaxed">{lesson.exemplo}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === "quiz" && question && (
            <div className="space-y-4">
              <p className="text-base font-bold text-slate-800 leading-snug">{question.pergunta}</p>

              <div className="space-y-2" role="radiogroup" aria-label="Alternativas">
                {optionsOf(question).map((opt) => (
                  <QuizOption
                    key={opt.key}
                    option={opt}
                    selected={selectedOption === opt.key}
                    answered={answered}
                    // Enquanto a resposta está errada, a certa não é revelada: o usuário tenta de novo
                    correctKey={isCorrect ? question.respostaCorreta : null}
                    onSelect={setSelectedOption}
                  />
                ))}
              </div>

              {answered && (
                <div
                  role="status"
                  className={`p-4 rounded-sm border flex gap-3 animate-fade-in ${isCorrect
                    ? "bg-emerald-50 border-emerald-100"
                    : "bg-red-50 border-red-100"
                    }`}
                >
                  {isCorrect ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                  )}
                  <div className="min-w-0 space-y-1">
                    <p className={`text-sm font-bold ${isCorrect ? "text-emerald-800" : "text-red-800"}`}>
                      {isCorrect ? "Resposta correta!" : "Ainda não foi dessa vez."}
                    </p>
                    {isCorrect ? (
                      question.explicacao && (
                        <p className="text-xs text-emerald-700 leading-relaxed">{question.explicacao}</p>
                      )
                    ) : (
                      <p className="text-xs text-red-700 leading-relaxed">
                        Releia a aula se precisar e tente outra alternativa.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {error && (
                <p className="text-xs font-bold text-red-700 bg-red-50 border border-red-100 p-3 rounded-sm text-center">
                  {error}
                </p>
              )}
            </div>
          )}

          {step === "result" && result && (
            <div className="flex flex-col items-center text-center py-4 space-y-4 animate-scale-in">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mi-pop"
                style={{ background: "color-mix(in srgb, var(--color-accent) 18%, transparent)" }}
              >
                <Trophy className="w-8 h-8" style={{ color: "var(--color-accent)" }} />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-extrabold text-slate-800">
                  {result.xpGanho > 0 ? "Aula concluída!" : "Revisão concluída!"}
                </h3>
                <p className="text-sm text-slate-500">
                  {result.xpGanho > 0
                    ? "Mais um passo na sua trilha de educação financeira."
                    : "Você já tinha concluído esta aula, então a revisão não rende XP de novo."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
                <div className="bg-slate-50 rounded-sm p-3">
                  <p className="text-xl font-black" style={{ color: "var(--color-accent)" }}>+{result.xpGanho} XP</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
                    Nível {result.nivelAtual} · {result.xpAtual} XP
                  </p>
                </div>
                <div className="bg-slate-50 rounded-sm p-3">
                  <p className="text-xl font-black text-slate-800">
                    {questions.length > 0 ? `${firstTry}/${questions.length}` : "—"}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
                    Acertos de primeira
                  </p>
                </div>
              </div>

              {result.medalhasDesbloqueadas?.length > 0 && (
                <div className="w-full max-w-sm bg-amber-100 rounded-sm p-3 flex items-center gap-3 text-left">
                  <Award className="w-6 h-6 text-amber-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-amber-800">
                      {result.medalhasDesbloqueadas.length > 1 ? "Novas medalhas" : "Nova medalha"}
                    </p>
                    <p className="text-sm font-extrabold text-amber-900">{result.medalhasDesbloqueadas.join(", ")}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rodapé com as ações da etapa */}
        <footer className="px-5 py-4 border-t border-slate-100 shrink-0 flex flex-wrap items-center justify-between gap-2">
          {step === "lesson" && (
            <>
              <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                {loading
                  ? "Carregando quiz..."
                  : questions.length === 0
                    ? "Esta aula não tem quiz"
                    : `Quiz com ${questions.length} pergunta${questions.length > 1 ? "s" : ""}`}
              </span>
              {questions.length > 0 ? (
                <Button onClick={() => setStep("quiz")} disabled={loading} className="py-2.5 px-5">
                  Ir para o quiz
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              ) : (
                <Button onClick={finishLesson} disabled={loading || finishing} className="py-2.5 px-5">
                  {finishing ? "Concluindo..." : "Concluir aula"}
                </Button>
              )}
              {error && <p className="w-full text-xs font-bold text-red-700">{error}</p>}
            </>
          )}

          {step === "quiz" && (
            <>
              <Button variant="ghost" icon={ArrowLeft} onClick={() => setStep("lesson")}>
                Reler a aula
              </Button>
              {!answered ? (
                <Button onClick={handleConfirm} disabled={selectedOption === null} className="py-2.5 px-5">
                  Confirmar resposta
                </Button>
              ) : isCorrect ? (
                <Button onClick={handleNext} disabled={finishing} className="py-2.5 px-5">
                  {finishing ? "Concluindo..." : isLast ? "Concluir aula" : "Próxima pergunta"}
                  {!finishing && <ArrowRight className="w-3.5 h-3.5" />}
                </Button>
              ) : (
                <Button icon={RotateCcw} onClick={handleRetry} className="py-2.5 px-5">
                  Tentar de novo
                </Button>
              )}
            </>
          )}

          {step === "result" && (
            <Button onClick={onClose} className="py-2.5 px-5 ml-auto">
              Continuar a trilha
            </Button>
          )}
        </footer>
      </div>
    </div>
  );
}
