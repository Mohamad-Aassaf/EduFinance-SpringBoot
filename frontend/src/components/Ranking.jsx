import { useState, useEffect } from "react";
import { Trophy, Award, Medal, ShieldAlert } from "lucide-react";
import { api } from "../api";

export default function Ranking({ user }) {
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRanking() {
      try {
        const data = await api.get("/api/perfis/ranking");
        setRanking(data);
      } catch (err) {
        console.error("Erro ao carregar ranking:", err);
      } finally {
        setLoading(false);
      }
    }
    loadRanking();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="text-gray-500 font-medium animate-pulse">Carregando ranking...</div>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-8 pt-2 pb-8 space-y-6 animate-[fadeIn_0.3s_ease-out]">

      <div className="bg-white rounded-sm shadow-sm border border-slate-100 overflow-hidden">
        <div className="divide-y divide-slate-100">
          {ranking.map((profile, index) => {
            const rank = index + 1;
            const isMe = profile.id === user.id;

            return (
              <div
                key={profile.id}
                className={`p-4 flex items-center justify-between transition text-xs font-semibold ${isMe ? "bg-indigo-50/40 text-indigo-950 font-bold border-l-4 border-indigo-650" : "text-slate-700 hover:bg-slate-50/50"
                  }`}
              >
                <div className="flex items-center gap-4">
                  {/* Posição com Ícone ou Número */}
                  <div className="w-8 flex justify-center shrink-0">
                    {rank === 1 ? (
                      <Trophy className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                    ) : rank === 2 ? (
                      <Medal className="w-5 h-5 text-slate-400 fill-slate-400" />
                    ) : rank === 3 ? (
                      <Medal className="w-5 h-5 text-amber-700 fill-amber-700" />
                    ) : (
                      <span className="text-slate-400 text-sm font-black">{rank}º</span>
                    )}
                  </div>

                  {/* Detalhes do Usuário */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm border">
                      {profile.nome.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-extrabold text-slate-800 text-sm">{profile.nome}</p>
                      <p className="text-[10px] text-slate-450 font-semibold mt-0.5">Nível {profile.nivel}</p>
                    </div>
                  </div>
                </div>

                {/* Pontuação */}
                <div className="text-right shrink-0">
                  <p className="text-sm font-black text-slate-850">{profile.xp} XP</p>
                  <p className="text-[9px] text-slate-400 font-bold">Saldo: R$ {profile.saldoVirtual.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
