import { useState, useEffect } from "react";
import { api } from "../api";

export default function LessonView({ lesson, user, onClose, onCompleted }) {
  const [questions, setQuestions] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [loading, setLoading] = useState(true);

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

  const handleAnswerSubmit = async () => {
    if (selectedOption === null || questions.length === 0) return;

    const question = questions[0];
    const correct = question.respostaCorreta === selectedOption;
    setIsCorrect(correct);
    setShowFeedback(true);

    if (correct) {
      try {
        // Envia a conclusão da lição para o backend Spring Boot
        const response = await api.post(`/api/licoes/${lesson.id}/concluir?usuarioId=${user.id}`);
        onCompleted(response.perfil, response.medalhasDesbloqueadas);
      } catch (err) {
        console.error("Erro ao concluir lição:", err);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-sm max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold text-xl"
        >
          ✕
        </button>

        <span className="text-xs uppercase font-bold tracking-wider text-indigo-650 bg-indigo-50 px-2.5 py-1 rounded-full">
          Módulo: {lesson.modulo.toUpperCase()}
        </span>
        <h2 className="text-2xl font-bold text-gray-800 mt-2 mb-4">{lesson.titulo}</h2>

        <div className="space-y-4 text-gray-600 text-sm leading-relaxed border-b pb-4 mb-4">
          <p className="whitespace-pre-line">{lesson.conteudo}</p>
          {lesson.exemplo && (
            <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-lg">
              <span className="font-bold text-emerald-800 block mb-1">Exemplo Prático:</span>
              <p className="text-emerald-700 italic">{lesson.exemplo}</p>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-4 text-gray-500">Carregando quiz...</div>
        ) : questions.length === 0 ? (
          <div className="text-center py-4 text-gray-500">Nenhum quiz cadastrado para esta lição.</div>
        ) : (
          <div className="space-y-4">
            <h3 className="font-bold text-gray-800 mb-2">Quiz da Lição:</h3>
            <p className="font-medium text-gray-700 mb-3">{questions[0].pergunta}</p>

            <div className="space-y-2">
              {[
                { key: 1, text: questions[0].opcaoA },
                { key: 2, text: questions[0].opcaoB },
                { key: 3, text: questions[0].opcaoC },
                { key: 4, text: questions[0].opcaoD },
              ].map((opt) => (
                <button
                  key={opt.key}
                  disabled={showFeedback}
                  onClick={() => setSelectedOption(opt.key)}
                  className={`w-full text-left p-3.5 rounded-sm border text-sm font-semibold transition duration-150 ${selectedOption === opt.key
                    ? "border-indigo-650 bg-indigo-50 text-indigo-700"
                    : "border-gray-250 hover:bg-gray-50 text-gray-700"
                    }`}
                >
                  {opt.text}
                </button>
              ))}
            </div>

            {!showFeedback ? (
              <button
                onClick={handleAnswerSubmit}
                disabled={selectedOption === null}
                className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-sm transition duration-150"
              >
                Enviar Resposta
              </button>
            ) : (
              <div className="mt-4 p-4 rounded-sm space-y-2">
                {isCorrect ? (
                  <div className="bg-emerald-50 text-emerald-800 p-3 rounded-lg font-bold text-center">
                    🎉 Resposta Correta! Você ganhou +20 XP!
                  </div>
                ) : (
                  <div className="bg-red-50 text-red-800 p-3 rounded-lg font-bold text-center">
                    ❌ Resposta incorreta. Tente ler o material novamente!
                  </div>
                )}
                {questions[0].explicacao && (
                  <p className="text-xs text-gray-500 mt-2 bg-gray-50 p-3 rounded-lg italic">
                    <span className="font-bold block text-gray-700 not-italic">Explicação:</span>
                    {questions[0].explicacao}
                  </p>
                )}
                <button
                  onClick={onClose}
                  className="w-full mt-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 rounded-sm transition"
                >
                  Fechar Lição
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
