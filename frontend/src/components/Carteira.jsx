import { useState, useEffect } from "react";
import { Wallet, DollarSign, PieChart, TrendingUp, TrendingDown, ArrowDownUp } from "lucide-react";
import { api } from "../api";
import ReactApexChart from "react-apexcharts";

const MOCK_PRICES = {
  DEMO3: 25.50,
  FAKE4: 10.00,
  TEST11: 100.00,
  PETR4: 38.50,
  VALE3: 62.10,
  ITUB4: 34.20,
  ABEV3: 12.10,
};

export default function Carteira({ user, onUpdateUser }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sellModal, setSellModal] = useState(null); // { stockCode, stockName, quantityOwned, price }
  const [sellQty, setSellQty] = useState(1);
  const [error, setError] = useState("");

  async function loadTransactions() {
    try {
      const data = await api.get(`/api/portfolio/transacoes/usuario/${user.id}`);
      setTransactions(data);
    } catch (err) {
      console.error("Erro ao buscar transações:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTransactions();
  }, [user.id]);

  // Calcula a carteira com base no histórico de transações
  const holdings = (() => {
    const map = new Map();
    const ordered = [...transactions].reverse();
    for (const tx of ordered) {
      const key = tx.stockCode;
      const existing = map.get(key) || {
        stockCode: tx.stockCode,
        stockName: tx.stockName,
        quantity: 0,
        avgPrice: 0,
        totalInvested: 0
      };

      if (tx.transactionType === "buy") {
        const newQty = existing.quantity + tx.quantity;
        const newTotal = existing.totalInvested + tx.totalValue;
        existing.avgPrice = newQty > 0 ? newTotal / newQty : 0;
        existing.quantity = newQty;
        existing.totalInvested = newTotal;
      } else {
        existing.quantity -= tx.quantity;
        existing.totalInvested = existing.quantity * existing.avgPrice;
      }

      if (existing.quantity > 0) {
        map.set(key, existing);
      } else {
        map.delete(key);
      }
    }
    return Array.from(map.values());
  })();

  // Estatísticas da Carteira
  const saldoDisponivel = user.saldoVirtual;
  const valorAcoes = holdings.reduce((sum, h) => {
    const currentPrice = MOCK_PRICES[h.stockCode] || h.avgPrice;
    return sum + (h.quantity * currentPrice);
  }, 0);
  const patrimonioTotal = saldoDisponivel + valorAcoes;

  const totalInvestido = holdings.reduce((sum, h) => sum + h.totalInvested, 0);
  const rendimentoAbsoluto = valorAcoes - totalInvestido;
  const rendimentoPercentual = totalInvestido > 0 ? (rendimentoAbsoluto / totalInvestido) * 100 : 0;

  const handleSellClick = (h) => {
    const price = MOCK_PRICES[h.stockCode] || h.avgPrice;
    setSellModal({
      stockCode: h.stockCode,
      stockName: h.stockName,
      quantityOwned: h.quantity,
      price
    });
    setSellQty(1);
    setError("");
  };

  const handleSellSubmit = async (e) => {
    e.preventDefault();
    if (!sellModal) return;
    setError("");

    if (sellQty <= 0 || sellQty > sellModal.quantityOwned) {
      setError("Quantidade inválida.");
      return;
    }

    try {
      const response = await api.post("/api/portfolio/transacoes", {
        usuarioId: user.id,
        stockCode: sellModal.stockCode,
        stockName: sellModal.stockName,
        transactionType: "sell",
        quantity: sellQty,
        price: sellModal.price
      });

      onUpdateUser(response.perfil);
      setSellModal(null);
      loadTransactions();
    } catch (err) {
      setError(err.message || "Erro ao realizar venda.");
    }
  };

  // Cores do gráfico circular
  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

  // Configurações do gráfico Donut da ApexCharts
  const seriesPie = holdings.map(h => h.quantity * (MOCK_PRICES[h.stockCode] || h.avgPrice));
  const labelsPie = holdings.map(h => h.stockCode);

  const optionsPie = {
    chart: {
      type: "donut",
      animations: { enabled: true, speed: 600 }
    },
    colors: COLORS,
    labels: labelsPie,
    legend: {
      show: true,
      position: "bottom",
      fontSize: "10px",
      fontWeight: 700,
      labels: { colors: "#475569" },
      markers: { size: 4 }
    },
    plotOptions: {
      pie: {
        donut: {
          size: "65%",
          labels: {
            show: true,
            name: {
              show: true,
              fontSize: "10px",
              fontWeight: 700,
              color: "#94a3b8",
              offsetY: -5
            },
            value: {
              show: true,
              fontSize: "13px",
              fontWeight: 900,
              color: "#1e293b",
              offsetY: 5,
              formatter: (val) => "R$ " + parseFloat(val).toLocaleString("pt-BR", { maximumFractionDigits: 0 })
            },
            total: {
              show: true,
              label: "Ações",
              color: "#94a3b8",
              formatter: () => "R$ " + valorAcoes.toLocaleString("pt-BR", { maximumFractionDigits: 0 })
            }
          }
        }
      }
    },
    dataLabels: { enabled: false },
    tooltip: {
      y: {
        formatter: (val) => "R$ " + val.toLocaleString("pt-BR", { minimumFractionDigits: 2 })
      }
    }
  };

  if (loading) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="text-gray-500 font-medium animate-pulse">Carregando carteira...</div>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-8 pt-2 pb-8 space-y-6 animate-[fadeIn_0.3s_ease-out]">

      {/* Grid de Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Patrimônio Total */}
        <div className="bg-white p-5 rounded-sm shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-50 rounded-sm flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5 text-indigo-500" />
          </div>
          <div>
            <p className="text-lg font-black text-slate-800">
              R$ {patrimonioTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Patrimônio Total</p>
          </div>
        </div>

        {/* Saldo Disponível */}
        <div className="bg-white p-5 rounded-sm shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald-50 rounded-sm flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-lg font-black text-slate-800">
              R$ {saldoDisponivel.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Saldo Disponível</p>
          </div>
        </div>

        {/* Em Ações */}
        <div className="bg-white p-5 rounded-sm shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-10 h-10 bg-orange-50 rounded-sm flex items-center justify-center shrink-0">
            <PieChart className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <p className="text-lg font-black text-slate-800">
              R$ {valorAcoes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Em Ações</p>
          </div>
        </div>

        {/* Rendimento */}
        <div className="bg-white p-5 rounded-sm shadow-sm border border-slate-100 flex items-center gap-4">
          <div className={`w-10 h-10 rounded-sm flex items-center justify-center shrink-0 ${rendimentoAbsoluto >= 0 ? "bg-emerald-50" : "bg-red-50"
            }`}>
            {rendimentoAbsoluto >= 0 ? (
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-500" />
            )}
          </div>
          <div>
            <p className={`text-lg font-black ${rendimentoAbsoluto >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {rendimentoAbsoluto >= 0 ? "+" : ""}R$ {rendimentoAbsoluto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {rendimentoPercentual.toFixed(2)}% Rendimento
            </p>
          </div>
        </div>
      </div>

      {/* Grid Principal - Tabela de Ações e Gráfico */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tabela de Ações */}
        <div className="bg-white p-6 rounded-sm shadow-sm border border-slate-100 lg:col-span-2 space-y-4">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Minhas Ações</h3>
          {holdings.length === 0 ? (
            <p className="text-xs text-slate-400 italic text-center py-8">
              Nenhuma ação na carteira. Vá ao Mercado para comprar!
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold">
                    <th className="py-2.5">Ação</th>
                    <th className="py-2.5 text-right">Qtd</th>
                    <th className="py-2.5 text-right">PM</th>
                    <th className="py-2.5 text-right">Atual</th>
                    <th className="py-2.5 text-right">Variação</th>
                    <th className="py-2.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                  {holdings.map((h) => {
                    const price = MOCK_PRICES[h.stockCode] || h.avgPrice;
                    const variation = ((price - h.avgPrice) / h.avgPrice) * 100;
                    return (
                      <tr key={h.stockCode} className="hover:bg-slate-50/50 transition">
                        <td className="py-3">
                          <p className="font-extrabold text-slate-800 text-sm">{h.stockCode}</p>
                          <p className="text-[10px] text-slate-400 font-medium truncate max-w-[130px]">
                            {h.stockName}
                          </p>
                        </td>
                        <td className="py-3 text-right">{h.quantity}</td>
                        <td className="py-3 text-right">R$ {h.avgPrice.toFixed(2)}</td>
                        <td className="py-3 text-right">R$ {price.toFixed(2)}</td>
                        <td className="py-3 text-right">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${variation >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                            }`}>
                            {variation >= 0 ? "+" : ""}{variation.toFixed(2)}%
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => handleSellClick(h)}
                            className="bg-white border border-slate-200 hover:border-slate-300 text-slate-750 font-bold px-3 py-1.5 rounded-lg transition"
                          >
                            Vender
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Gráfico de Distribuição */}
        <div className="bg-white p-6 rounded-sm shadow-sm border border-slate-100 space-y-4">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Distribuição</h3>
          {holdings.length === 0 ? (
            <p className="text-xs text-slate-400 italic text-center py-12">
              Nenhuma ação comprada ainda.
            </p>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[220px]">
              <ReactApexChart
                options={optionsPie}
                series={seriesPie}
                type="donut"
                width="100%"
                height={260}
              />
            </div>
          )}
        </div>
      </div>

      {/* Histórico de Operações */}
      <div className="bg-white p-6 rounded-sm shadow-sm border border-slate-100 space-y-4">
        <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
          <ArrowDownUp className="w-4 h-4 text-slate-400" />
          Histórico de Operações
        </h3>
        {transactions.length === 0 ? (
          <p className="text-xs text-slate-400 italic text-center py-4">Nenhuma operação realizada ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold">
                  <th className="py-2.5">Data</th>
                  <th className="py-2.5">Tipo</th>
                  <th className="py-2.5">Ação</th>
                  <th className="py-2.5 text-right">Qtd</th>
                  <th className="py-2.5 text-right">Preço</th>
                  <th className="py-2.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                {transactions.slice(0, 10).map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 font-medium text-slate-500">
                      {new Date(tx.createdAt).toLocaleDateString("pt-BR")}
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

      {/* Modal de Confirmação de Venda */}
      {sellModal && (
        <div className="fixed inset-0 bg-slate-950/40 bg-opacity-50 flex items-center justify-center p-4 z-50 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-sm max-w-sm w-full p-6 relative shadow-2xl border border-slate-100 space-y-4">
            <button
              onClick={() => setSellModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold text-lg"
            >
              ✕
            </button>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Vender {sellModal.stockCode}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{sellModal.stockName}</p>
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 p-2.5 rounded-sm text-center text-xs font-bold border border-red-100">
                {error}
              </div>
            )}

            <form onSubmit={handleSellSubmit} className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-sm space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Preço atual:</span>
                  <span className="font-bold text-slate-800">R$ {sellModal.price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Disponível para venda:</span>
                  <span className="font-bold text-slate-800">{sellModal.quantityOwned} un.</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1">
                  Quantidade a vender
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={sellModal.quantityOwned}
                  className="w-full px-3 py-2 border border-slate-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-semibold"
                  value={sellQty}
                  onChange={(e) => setSellQty(Math.max(1, Math.min(sellModal.quantityOwned, parseInt(e.target.value) || 1)))}
                />
              </div>

              <div className="flex justify-between items-center bg-emerald-50/50 p-3 rounded-sm border border-emerald-100 text-xs">
                <span className="font-bold text-emerald-800">Total a receber:</span>
                <span className="font-black text-emerald-800 text-sm">
                  R$ {(sellQty * sellModal.price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSellModal(null)}
                  className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-sm text-xs transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-1/2 bg-red-650 hover:bg-red-700 text-white font-bold py-2 rounded-sm text-xs shadow-md transition"
                >
                  Confirmar Venda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
