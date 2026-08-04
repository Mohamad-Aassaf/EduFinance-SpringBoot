import { useState, useEffect } from "react";
import { CheckCircle, BookOpen, Star, Crown, Flame, Target, Trophy, Sparkles } from "lucide-react";
import { api } from "../api";
import LessonView from "./LessonView";

const MODULE_CONFIG = {
  fundamentos: { label: "Fundamentos", emoji: "📘", order: 1 },
  planejamento: { label: "Planejamento Financeiro", emoji: "📋", order: 2 },
  investimentos: { label: "Investimentos", emoji: "💰", order: 3 },
};

export default function Trilha({ user, onUpdateUser }) {
  const [lessons, setLessons] = useState([]);
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState(null);

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

  const handleLessonCompleted = (updatedUser, newBadges) => {
    onUpdateUser(updatedUser);
    if (newBadges && newBadges.length > 0) {
      alert(`🎉 Parabéns! Você ganhou a medalha: ${newBadges.join(", ")}`);
    }
    setSelectedLesson(null);
    loadData();
  };

  if (loading) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="text-gray-500 font-medium animate-pulse">Carregando trilha...</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8 animate-[fadeIn_0.3s_ease-out]">
      {/* Header com Status do Usuário */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-100 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800">Trilha de Aprendizado</h1>
          <p className="text-sm text-slate-500 mt-1">Conclua as lições e avance na jornada.</p>
        </div>
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
          <span className="text-sm font-extrabold text-indigo-650">{progressPercent}%</span>
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

                  return (
                    <div key={lesson.id} className="flex flex-col items-center relative">
                      {/* Linha Conectora */}
                      {idx > 0 && (
                        <div className={`w-1 h-8 -mt-2 mb-2 transition-colors duration-500 ${completed ? "bg-emerald-400" : "bg-slate-200"
                          }`} />
                      )}

                      {/* Botão do Nó */}
                      <button
                        onClick={() => setSelectedLesson(lesson)}
                        style={{ transform: `translateX(${offset}px)` }}
                        className="group relative transition hover:scale-105 duration-200 focus:outline-none"
                        title={lesson.titulo}
                      >
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${completed
                          ? "bg-emerald-500 text-white ring-4 ring-emerald-100"
                          : isNext
                            ? "bg-indigo-600 text-white ring-4 ring-indigo-200 animate-pulse"
                            : "bg-indigo-400 text-white ring-4 ring-indigo-50"
                          }`}>
                          {completed ? (
                            <CheckCircle className="w-8 h-8" />
                          ) : idx === 0 ? (
                            <Star className="w-8 h-8 fill-white" />
                          ) : idx === module.lessons.length - 1 ? (
                            <Crown className="w-8 h-8" />
                          ) : (
                            <BookOpen className="w-7 h-7" />
                          )}
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
          onClose={() => setSelectedLesson(null)}
          onCompleted={handleLessonCompleted}
        />
      )}
    </div>
  );
}
