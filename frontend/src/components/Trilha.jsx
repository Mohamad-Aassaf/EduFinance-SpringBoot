import { useState, useEffect, useRef } from "react";
import { CheckCircle, BookOpen, Star, Crown, Flame, Target, Trophy, Sparkles } from "lucide-react";
import { api } from "../api";
import LessonView from "./LessonView";
import { toast, isMotionEnabled } from "../motion";

// Tempos (em segundos) da comemoração ao concluir uma aula:
// a bolinha concluída pula, o rio enche em direção à próxima aula e ela pula quando a água chega
const RIO_INICIO = 0.45;
const RIO_DURACAO = 1.3;
const CHEGADA = RIO_INICIO + RIO_DURACAO - 0.15;
const COMEMORACAO_TOTAL_MS = 3400;

// Rio em curva ligando a bolinha anterior (deslocada em xDe) à seguinte (deslocada em xPara)
function Rio({ id, xDe, xPara, comAgua, enchendo }) {
  const largura = 160;
  const altura = 44;
  const x1 = largura / 2 + xDe;
  const x2 = largura / 2 + xPara;
  const d = `M ${x1} 2 C ${x1} ${altura / 2}, ${x2} ${altura / 2}, ${x2} ${altura - 2}`;
  const estilo = enchendo
    ? { "--tr-delay": `${RIO_INICIO}s`, "--tr-dur": `${RIO_DURACAO}s`, "--tr-fade": `${RIO_INICIO + RIO_DURACAO - 0.2}s` }
    : undefined;

  return (
    <svg width={largura} height={altura} viewBox={`0 0 ${largura} ${altura}`} className="mt-3 mb-1 overflow-visible" aria-hidden="true">
      <defs>
        <linearGradient id={`rio-${id}`} x1="0" y1="0" x2="0" y2={altura} gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      <path d={d} className="tr-rio-leito" fill="none" strokeWidth="12" strokeLinecap="round" />
      {comAgua && (
        <>
          <path
            d={d}
            pathLength="1"
            fill="none"
            stroke={`url(#rio-${id})`}
            strokeWidth="8"
            strokeLinecap="round"
            className={`tr-rio-agua ${enchendo ? "tr-rio-enchendo" : ""}`}
            style={estilo}
          />
          <path
            d={d}
            pathLength="1"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            className={`tr-rio-corrente ${enchendo ? "tr-rio-corrente-atrasada" : ""}`}
            style={estilo}
          />
        </>
      )}
    </svg>
  );
}

// Faíscas que saem da bolinha quando ela comemora
function Faiscas() {
  return Array.from({ length: 8 }, (_, i) => (
    <span key={i} className="tr-faisca" style={{ "--tr-ang": `${i * 45}deg` }} />
  ));
}

const MODULE_CONFIG = {
  fundamentos: { label: "Fundamentos", emoji: "📘", order: 1 },
  planejamento: { label: "Planejamento Financeiro", emoji: "📋", order: 2 },
  investimentos: { label: "Investimentos", emoji: "💰", order: 3 },
  economia: { label: "Economia Global", emoji: "🌍", order: 4 },
  cripto: { label: "Criptomoedas", emoji: "🪙", order: 5 },
};

export default function Trilha({ user, onUpdateUser }) {
  const [lessons, setLessons] = useState([]);
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState(null);
  // { feita, proxima, mesmoModulo } enquanto a animação de avanço na trilha estiver rodando
  const [comemoracao, setComemoracao] = useState(null);
  // Aulas concluídas no momento em que a aula foi aberta, para descobrir o que foi concluído nela
  const concluidasAoAbrir = useRef(null);
  const timerComemoracao = useRef(null);

  async function loadData() {
    try {
      const [lessonsList, progressList] = await Promise.all([
        api.get("/api/licoes"),
        api.get(`/api/licoes/usuario/${user.id}/progresso`)
      ]);
      setLessons(lessonsList);
      setProgress(progressList);
    } catch (err) {
      console.error("Erro ao carregar trilha:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [user.id]);

  const completedIds = new Set(
    progress.filter((p) => p.concluido).map((p) => p.licaoId)
  );

  const totalLessons = lessons.length;
  const completedLessons = completedIds.size;
  const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  // Agrupa as lições por módulo
  const groupedModules = Object.entries(MODULE_CONFIG)
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([key, config]) => {
      const moduleLessons = lessons.filter((l) => l.modulo === key)
        .sort((a, b) => a.ordemLicao - b.ordemLicao);
      return {
        key,
        ...config,
        lessons: moduleLessons,
      };
    })
    .filter((m) => m.lessons.length > 0);

  const ordemDasAulas = groupedModules.flatMap((m) => m.lessons.map((l) => ({ id: l.id, modulo: m.key })));

  const abrirAula = (lesson) => {
    concluidasAoAbrir.current = new Set(completedIds);
    setSelectedLesson(lesson);
  };

  // Quando a janela da aula fecha e há uma aula recém-concluída, o rio corre até a próxima
  useEffect(() => {
    if (selectedLesson || !concluidasAoAbrir.current) return;
    const antes = concluidasAoAbrir.current;
    const nova = ordemDasAulas.find((a) => completedIds.has(a.id) && !antes.has(a.id));
    if (!nova) return;
    concluidasAoAbrir.current = null;

    const posicao = ordemDasAulas.findIndex((a) => a.id === nova.id);
    const proxima = ordemDasAulas[posicao + 1] || null;
    setComemoracao({
      feita: nova.id,
      proxima: proxima?.id ?? null,
      mesmoModulo: proxima?.modulo === nova.modulo,
    });

    document.querySelector(`[data-licao="${nova.id}"]`)?.scrollIntoView({
      behavior: isMotionEnabled() ? "smooth" : "auto",
      block: "center",
    });

    clearTimeout(timerComemoracao.current);
    timerComemoracao.current = setTimeout(() => setComemoracao(null), COMEMORACAO_TOTAL_MS);
  }, [selectedLesson, progress]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => clearTimeout(timerComemoracao.current), []);

  // A janela da aula continua aberta mostrando o resultado; aqui só atualizamos os dados por trás
  const handleLessonCompleted = (updatedUser) => {
    if (updatedUser.nivel > user.nivel) {
      toast(`Você subiu para o nível ${updatedUser.nivel}!`);
    }
    onUpdateUser(updatedUser);
    loadData();
  };

  if (loading) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="text-slate-500 font-medium animate-pulse">Carregando trilha...</div>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-8 pt-2 pb-8 max-w-3xl mx-auto space-y-8 animate-[fadeIn_0.3s_ease-out]">
      {/* Header com Status do Usuário */}
      <div className="flex items-center justify-center flex-wrap gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-white border border-slate-100 rounded-full px-4 py-2 shadow-sm text-sm font-bold text-slate-700">
            <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
            <span>{user.xp} XP</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white border border-slate-100 rounded-full px-4 py-2 shadow-sm text-sm font-bold text-slate-700">
            <Target className="w-4 h-4 text-indigo-500" />
            <span>Nível {user.nivel}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white border border-slate-100 rounded-full px-4 py-2 shadow-sm text-sm font-bold text-slate-700">
            <Trophy className="w-4 h-4 text-emerald-500" />
            <span>{completedLessons}/{totalLessons}</span>
          </div>
        </div>
      </div>

      {/* Progresso Geral */}
      <div className="bg-white border border-slate-100 rounded-sm p-6 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Progresso Geral</span>
          <span className="text-sm font-extrabold text-indigo-600">{progressPercent}%</span>
        </div>
        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
          <div
            className="bg-indigo-600 h-full transition-all duration-700 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Caminho Estilo Duolingo */}
      <div className="space-y-16 pb-12">
        {groupedModules.map((module) => {
          const moduleLessonsCompleted = module.lessons.filter((l) => completedIds.has(l.id)).length;
          const allComplete = moduleLessonsCompleted === module.lessons.length && module.lessons.length > 0;

          return (
            <div key={module.key} className="flex flex-col items-center">
              {/* Cabeçalho do Módulo */}
              <div className="w-full max-w-md mb-8">
                <div className={`bg-white border rounded-sm px-5 py-4 flex items-center justify-between shadow-sm transition-all duration-300 ${allComplete ? "border-emerald-200 bg-emerald-50/30" : "border-slate-100"
                  }`}>
                  <div className="flex items-center gap-3.5">
                    <span className="text-3xl">{module.emoji}</span>
                    <div>
                      <h2 className="text-base font-extrabold text-slate-800">{module.label}</h2>
                      <p className="text-xs font-semibold text-slate-400">
                        {moduleLessonsCompleted}/{module.lessons.length} aulas
                      </p>
                    </div>
                  </div>
                  {allComplete && (
                    <span className="inline-flex items-center gap-1 bg-emerald-500 text-white px-2.5 py-1 rounded-full text-xs font-bold shadow-sm">
                      <Sparkles className="w-3.5 h-3.5" /> Completo
                    </span>
                  )}
                </div>
              </div>

              {/* Nós de Lições Winding */}
              <div className="flex flex-col items-center gap-6">
                {module.lessons.map((lesson, idx) => {
                  const completed = completedIds.has(lesson.id);
                  // Alterna deslocamento para esquerda e direita para fazer o caminho sinuoso
                  const offset = idx % 2 === 0 ? -40 : 40;
                  const prevCompleted = idx === 0 || completedIds.has(module.lessons[idx - 1].id);
                  const isNext = !completed && prevCompleted;

                  const prevLesson = idx > 0 ? module.lessons[idx - 1] : null;
                  const prevOffset = -offset;

                  const comemoraFeita = comemoracao?.feita === lesson.id;
                  const comemoraChegada = comemoracao?.proxima === lesson.id;
                  const rioEnchendo = comemoraChegada && comemoracao.mesmoModulo && prevLesson?.id === comemoracao.feita;
                  const atrasoChegada = comemoracao?.mesmoModulo ? CHEGADA : 0.6;

                  const animacao = comemoraFeita
                    ? "tr-celebra tr-celebra-feita"
                    : comemoraChegada
                      ? "tr-celebra tr-celebra-chegada"
                      : isNext
                        ? "tr-proxima"
                        : completed
                          ? "tr-concluida"
                          : "";
                  const atraso = comemoraChegada ? `${atrasoChegada}s` : comemoraFeita ? "0s" : `${(idx * 0.9) % 5}s`;

                  return (
                    <div key={lesson.id} className="flex flex-col items-center relative">
                      {/* Rio até esta aula: ganha água quando a aula anterior é concluída */}
                      {prevLesson && (
                        <Rio
                          id={lesson.id}
                          xDe={prevOffset}
                          xPara={offset}
                          comAgua={completedIds.has(prevLesson.id)}
                          enchendo={rioEnchendo}
                        />
                      )}

                      {/* Botão do Nó */}
                      <button
                        data-licao={lesson.id}
                        onClick={() => abrirAula(lesson)}
                        style={{ transform: `translateX(${offset}px)` }}
                        className="group relative transition hover:scale-105 duration-200 focus:outline-none"
                        title={lesson.titulo}
                      >
                        <div
                          style={{ "--tr-delay": atraso }}
                          className={`tr-no relative w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-colors duration-300 ${animacao} ${completed
                            ? "bg-emerald-500 text-white ring-4 ring-emerald-100"
                            : isNext
                              ? "bg-indigo-600 text-white ring-4 ring-indigo-200"
                              : "bg-indigo-400 text-white ring-4 ring-indigo-50"
                            }`}
                        >
                          {isNext && !comemoraChegada && <span className="tr-halo" />}
                          {(comemoraFeita || comemoraChegada) && <span className="tr-explosao" />}
                          <span className="tr-brilho" />
                          {completed ? (
                            <CheckCircle className="relative w-8 h-8" />
                          ) : idx === 0 ? (
                            <Star className="relative w-8 h-8 fill-white" />
                          ) : idx === module.lessons.length - 1 ? (
                            <Crown className="relative w-8 h-8" />
                          ) : (
                            <BookOpen className="relative w-7 h-7" />
                          )}
                          {(comemoraFeita || comemoraChegada) && <Faiscas />}
                        </div>

                        {/* Rótulo da Lição */}
                        <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-center">
                          <span className={`text-xs font-bold transition-colors ${isNext ? "text-indigo-600 font-extrabold" : "text-slate-500 group-hover:text-slate-800"
                            }`}>
                            {lesson.titulo.length > 22 ? lesson.titulo.slice(0, 20) + "…" : lesson.titulo}
                          </span>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Lição */}
      {selectedLesson && (
        <LessonView
          lesson={selectedLesson}
          user={user}
          alreadyCompleted={completedIds.has(selectedLesson.id)}
          onClose={() => setSelectedLesson(null)}
          onCompleted={handleLessonCompleted}
        />
      )}
    </div>
  );
}
