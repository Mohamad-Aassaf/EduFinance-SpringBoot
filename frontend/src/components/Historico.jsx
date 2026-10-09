import { useState, useEffect } from "react";
import { ArrowDownUp, Bot, MessageSquare, Trash2, ChevronRight } from "lucide-react";
import { api } from "../api";

export default function Historico({ user }) {
  const [activeTab, setActiveTab] = useState("transactions");
  const [transactions, setTransactions] = useState([]);
  const [chatSessions, setChatSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    loadTransactions();
    loadChatSessions();
  }, [user.id]);

  async function loadTransactions() {
    setLoading(true);
    try {
      const data = await api.get(`/api/portfolio/transacoes/usuario/${user.id}`);
      setTransactions(data);
    } catch (err) {
      console.error("Erro ao carregar transações:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadChatSessions() {
    setChatLoading(true);
    try {
      const data = await api.get("/api/finbot/history");
      setChatSessions(data);
    } catch (err) {
      console.error("Erro ao carregar histórico de IA:", err);
    } finally {
      setChatLoading(false);
    }
  }

  async function handleDeleteSession(sessionId) {
    try {
      await api.delete(`/api/finbot/history/${sessionId}`);
      setChatSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (err) {
      console.error("Erro ao excluir sessão:", err);
    }
  }

  const tabCls = (tab) =>
    `px-4 py-2 rounded-sm text-xs font-bold transition ${activeTab === tab
      ? "bg-indigo-600 text-white shadow-sm"
      : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
    }`;

  return (
    <div className="px-4 md:px-8 pt-2 pb-8 space-y-6 animate-[fadeIn_0.3s_ease-out]">

      {/* Tab switcher */}
      <div className="flex gap-2 bg-slate-100 p-1 rounded-sm w-fit">
        <button className={tabCls("transactions")} onClick={() => setActiveTab("transactions")}>
          <span className="flex items-center gap-1.5">
            <ArrowDownUp className="w-3.5 h-3.5" />
            Operações
          </span>
        </button>
        <button className={tabCls("ai")} onClick={() => setActiveTab("ai")}>
          <span className="flex items-center gap-1.5">
            <Bot className="w-3.5 h-3.5" />
            Conversas FinBot
            {chatSessions.length > 0 && (
              <span className="bg-indigo-200 text-indigo-800 text-[9px] font-black px-1.5 py-0.5 rounded-full">
                {chatSessions.length}
              </span>
            )}
          </span>
        </button>
      </div>

      {/* Transactions tab */}
      {activeTab === "transactions" && (
        <div className="bg-white p-6 rounded-sm shadow-sm border border-slate-100 space-y-4">
          {loading ? (
            <p className="text-xs text-slate-400 text-center py-8 animate-pulse">Carregando operações...</p>
          ) : transactions.length === 0 ? (
            <p className="text-xs text-slate-400 italic text-center py-8">Nenhuma operação realizada ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold">
                    <th className="py-2.5">Data/Hora</th>
                    <th className="py-2.5">Tipo</th>
                    <th className="py-2.5">Ação</th>
                    <th className="py-2.5 text-right">Quantidade</th>
                    <th className="py-2.5 text-right">Preço Unitário</th>
                    <th className="py-2.5 text-right">Valor Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 font-medium text-slate-500">
                        {new Date(tx.createdAt).toLocaleString("pt-BR")}
                      </td>
                      <td className="py-3">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${tx.transactionType === "buy" ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"
                          }`}>
                          {tx.transactionType === "buy" ? "Compra" : "Venda"}
                        </span>
                      </td>
                      <td className="py-3 text-slate-800 font-extrabold text-sm">{tx.stockCode}</td>
                      <td className="py-3 text-right">{tx.quantity}</td>
                      <td className="py-3 text-right">R$ {tx.pricePerUnit.toFixed(2)}</td>
                      <td className="py-3 text-right text-slate-900 font-extrabold">
                        R$ {tx.totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* AI Conversations tab */}
      {activeTab === "ai" && (
        <div className="bg-white p-6 rounded-sm shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Bot className="w-4 h-4 text-indigo-500" />
              Histórico de Conversas com o FinBot
            </h3>
            <span className="text-xs text-slate-400">{chatSessions.length} sessão(ões)</span>
          </div>

          {chatLoading ? (
            <p className="text-xs text-slate-400 text-center py-8 animate-pulse">Carregando conversas...</p>
          ) : chatSessions.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <MessageSquare className="w-10 h-10 mx-auto text-slate-200" />
              <p className="text-xs text-slate-400 italic">
                Nenhuma conversa com o FinBot ainda. Vá ao Professor FinBot e comece a perguntar!
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {chatSessions.map((session) => (
                <div
                  key={session.id}
                  className="group flex items-center gap-4 p-4 rounded-sm border border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/30 transition"
                >
                  <div className="w-9 h-9 rounded-sm bg-indigo-50 text-indigo-500 flex items-center justify-center border border-indigo-100 shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{session.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded-full">
                        {session.model}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(session.createdAt).toLocaleString("pt-BR")}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteSession(session.id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition shrink-0 p-1.5 rounded-lg hover:bg-red-50"
                    title="Excluir conversa"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
