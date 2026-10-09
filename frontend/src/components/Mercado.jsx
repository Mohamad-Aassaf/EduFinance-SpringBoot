import { useState, useEffect } from "react";
import { Search, ArrowDownUp, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { api } from "../api";
import ReactApexChart from "react-apexcharts";

const INITIAL_STOCKS = [
  { symbol: "DEMO3", shortName: "Demonstração S/A", regularMarketPrice: 25.50, regularMarketChangePercent: 0.0, longName: "Demonstração S/A Corporativa" },
  { symbol: "FAKE4", shortName: "Falsa Holding Ltda", regularMarketPrice: 10.00, regularMarketChangePercent: 0.0, longName: "Falsa Holding Companhia" },
  { symbol: "TEST11", shortName: "Fundo de Teste Simulado", regularMarketPrice: 100.00, regularMarketChangePercent: 0.0, longName: "Fundo de Investimento de Teste" },
  { symbol: "PETR4", shortName: "Petrobras PN", regularMarketPrice: 38.50, regularMarketChangePercent: 0.45, longName: "Petróleo Brasileiro S/A" },
  { symbol: "VALE3", shortName: "Vale ON", regularMarketPrice: 62.10, regularMarketChangePercent: -0.22, longName: "Vale S.A." },
  { symbol: "ITUB4", shortName: "Itaú Unibanco PN", regularMarketPrice: 34.20, regularMarketChangePercent: 1.15, longName: "Itaú Unibanco Holding S.A." },
  { symbol: "ABEV3", shortName: "Ambev ON", regularMarketPrice: 12.10, regularMarketChangePercent: -0.80, longName: "Ambev S.A." },
];

// ─── Gera histórico simulado pseudo-aleatório baseado no símbolo ──────────────
// Usa os char codes do símbolo como seed para ser determinístico por ação
function gerarHistoricoSimulado(symbol, currentPrice, dias = 30) {
  const seed = symbol.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const valores = [];
  let preco = currentPrice * (0.88 + (seed % 15) / 100); // preço inicial ~12% abaixo do atual

  for (let i = 0; i < dias; i++) {
    // pseudo-random com seed determinístico
    const rng = Math.sin(seed * (i + 1) * 9301 + 49297) * 0.5 + 0.5;
    const variacao = (rng - 0.48) * 1.8; // entre -0.86% e +0.94%
    preco = Math.max(0.5, preco * (1 + variacao / 100));
    valores.push(parseFloat(preco.toFixed(2)));
  }
  // garante que o último ponto seja o preço atual
  valores[dias - 1] = parseFloat(currentPrice.toFixed(2));
  return valores;
}

export default function Mercado({ user, onUpdateUser }) {
  const [stocks, setStocks] = useState(INITIAL_STOCKS);
  const [search, setSearch] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);
  const [qty, setQty] = useState(1);
  const [tradeTab, setTradeTab] = useState("buy");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  async function loadTransactions() {
    try {
      const data = await api.get(`/api/portfolio/transacoes/usuario/${user.id}`);
      setTransactions(data);
    } catch (err) {
      console.error("Erro ao carregar transações:", err);
    }
  }

  useEffect(() => {
    loadTransactions();

    const interval = setInterval(() => {
      setStocks((prevStocks) =>
        prevStocks.map((s) => {
          const changePercent = (Math.random() * 2 - 1) * 0.8;
          const newPrice = Math.max(0.5, s.regularMarketPrice * (1 + changePercent / 100));
          return {
            ...s,
            regularMarketPrice: Math.round(newPrice * 100) / 100,
            regularMarketChangePercent: s.regularMarketChangePercent + changePercent,
          };
        })
      );
    }, 6000);

    return () => clearInterval(interval);
  }, [user.id]);

  const holdings = (() => {
    const map = new Map();
    const ordered = [...transactions].reverse();
    for (const tx of ordered) {
      const key = tx.stockCode;
      const existing = map.get(key) || 0;
      if (tx.transactionType === "buy") {
        map.set(key, existing + tx.quantity);
      } else {
        map.set(key, Math.max(0, existing - tx.quantity));
      }
    }
    return map;
  })();

  const filtered = stocks.filter(
    (s) =>
      s.symbol.toLowerCase().includes(search.toLowerCase()) ||
      s.shortName.toLowerCase().includes(search.toLowerCase())
  );

  const handleStockClick = (stock) => {
    setSelectedStock(stock);
    setQty(1);
    setTradeTab("buy");
    setError("");
    setSuccessMsg("");
  };

  const handleTradeSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStock) return;
    setError("");
    setSuccessMsg("");

    const total = qty * selectedStock.regularMarketPrice;

    if (tradeTab === "buy" && total > user.saldoVirtual) {
      setError("Saldo virtual insuficiente.");
      return;
    }

    const ownedQty = holdings.get(selectedStock.symbol) || 0;
    if (tradeTab === "sell" && qty > ownedQty) {
      setError("Quantidade insuficiente de ações para vender.");
      return;
    }

    try {
      const response = await api.post("/api/portfolio/transacoes", {
        usuarioId: user.id,
        stockCode: selectedStock.symbol,
        stockName: selectedStock.shortName,
        transactionType: tradeTab,
        quantity: qty,
        price: selectedStock.regularMarketPrice,
      });

      onUpdateUser(response.perfil);
      setSuccessMsg(`Operação de ${tradeTab === "buy" ? "compra" : "venda"} realizada com sucesso!`);
      loadTransactions();
      setTimeout(() => setSelectedStock(null), 1500);
    } catch (err) {
      setError(err.message || "Erro ao processar transação.");
    }
  };

  const currentOwned = selectedStock ? holdings.get(selectedStock.symbol) || 0 : 0;
  const totalCost = selectedStock ? qty * selectedStock.regularMarketPrice : 0;

  // ─── Configuração do gráfico de linha (sparkline) do modal ───────────────────
  const buildSparklineOptions = (stock) => {
    const isUp = stock.regularMarketChangePercent >= 0;
    const lineColor = isUp ? "#10b981" : "#ef4444";
    const historico = gerarHistoricoSimulado(stock.symbol, stock.regularMarketPrice);

    const series = [{ name: "Preço", data: historico }];

    const options = {
      chart: {
        type: "line",
        height: 90,
        sparkline: { enabled: true },
        animations: { enabled: true, speed: 500 },
        background: "transparent",
      },
      stroke: { curve: "smooth", width: 2.5 },
      colors: [lineColor],
      fill: {
        type: "gradient",
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.3,
          opacityTo: 0.0,
          stops: [0, 100],
        },
      },
      tooltip: {
        fixed: { enabled: false },
        x: { show: false },
        y: {
          formatter: (val) => "R$ " + val.toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
          title: { formatter: () => "" },
        },
        marker: { show: false },
      },
    };

    return { series, options };
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6 animate-[fadeIn_0.3s_ease-out]">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800">Mercado</h1>
          <p className="text-sm text-slate-500 mt-1">Explore ações e invista com seu saldo virtual.</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-sm border border-slate-100 shadow-sm flex items-center gap-2 text-sm font-bold text-slate-700">
          <DollarSign className="w-4 h-4 text-emerald-500" />
          <span>Saldo Virtual:</span>
          <span className="text-emerald-600 font-extrabold">
            R$ {user.saldoVirtual.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Barra de Busca */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar ação por código ou nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-semibold text-slate-750 bg-white"
        />
      </div>

      {/* Grid de Ações */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {filtered.map((stock) => {
          const owned = holdings.get(stock.symbol) || 0;
          const isUp = stock.regularMarketChangePercent >= 0;
          const miniHistorico = gerarHistoricoSimulado(stock.symbol, stock.regularMarketPrice);

          const contextoFinBot =
            `Ação: ${stock.symbol} — ${stock.longName}. ` +
            `Preço atual: R$ ${stock.regularMarketPrice.toFixed(2)}. ` +
            `Variação hoje: ${stock.regularMarketChangePercent.toFixed(2)}%. ` +
            `Você possui: ${owned} unidade(s). ` +
            `Esta ação é negociada na B3 (Bolsa de Valores brasileira). ` +
            (owned > 0
              ? `Valor da sua posição: R$ ${(owned * stock.regularMarketPrice).toFixed(2)}.`
              : "Você ainda não possui esta ação na carteira.");

          return (
            <div
              key={stock.symbol}
              onClick={() => handleStockClick(stock)}
              data-finbot-context={contextoFinBot}
              className="bg-white p-5 rounded-sm border border-slate-100 hover:border-blue-200 hover:shadow-md shadow-sm cursor-pointer transition-all duration-200 flex flex-col justify-between space-y-3"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-base font-extrabold text-slate-800">{stock.symbol}</h3>
                  <p className="text-xs font-semibold text-slate-400">{stock.shortName}</p>
                </div>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    isUp ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                  }`}
                >
                  {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {stock.regularMarketChangePercent.toFixed(2)}%
                </span>
              </div>

              {/* Mini sparkline no card */}
              <div className="-mx-1">
                <ReactApexChart
                  options={{
                    chart: {
                      type: "line",
                      height: 50,
                      sparkline: { enabled: true },
                      animations: { enabled: false },
                      background: "transparent",
                    },
                    stroke: { curve: "smooth", width: 2 },
                    colors: [isUp ? "#10b981" : "#ef4444"],
                    tooltip: { enabled: false },
                  }}
                  series={[{ data: miniHistorico }]}
                  type="line"
                  height={50}
                />
              </div>

              <div className="flex justify-between items-end border-t border-slate-50 pt-2">
                <div>
                  <p className="text-xs font-bold text-slate-400">Preço</p>
                  <p className="text-base font-black text-slate-800">
                    R$ {stock.regularMarketPrice.toFixed(2)}
                  </p>
                </div>
                {owned > 0 && (
                  <span
                    className="text-xs font-bold px-2.5 py-0.5 rounded-full text-white"
                    style={{ background: "#F97316" }}
                  >
                    {owned} na carteira
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-xs text-slate-400 italic text-center py-8">Nenhuma ação correspondente encontrada.</p>
      )}

      {/* Modal de Trade */}
      {selectedStock && (() => {
        const { series, options } = buildSparklineOptions(selectedStock);
        const isUp = selectedStock.regularMarketChangePercent >= 0;

        return (
          <div className="fixed inset-0 bg-slate-950/40 bg-opacity-50 flex items-center justify-center p-4 z-50 animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-white rounded-sm max-w-sm w-full p-6 relative shadow-2xl border border-slate-100 space-y-4">
              <button
                onClick={() => setSelectedStock(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>

              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">{selectedStock.symbol}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{selectedStock.longName}</p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                      isUp ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                    }`}
                  >
                    {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {selectedStock.regularMarketChangePercent.toFixed(2)}%
                  </span>
                </div>

                {/* Gráfico de Linha — histórico simulado 30 dias */}
                <div className="mt-3 -mx-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-1">
                    Histórico simulado — 30 dias
                  </p>
                  <ReactApexChart
                    options={options}
                    series={series}
                    type="line"
                    height={90}
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 text-red-700 p-2.5 rounded-sm text-center text-xs font-bold border border-red-100">
                  {error}
                </div>
              )}

              {successMsg && (
                <div className="bg-emerald-50 text-emerald-800 p-2.5 rounded-sm text-center text-xs font-bold border border-emerald-100">
                  {successMsg}
                </div>
              )}

              {/* Alternador de Compra/Venda */}
              <div className="flex border-b border-slate-100 pb-1">
                <button
                  type="button"
                  onClick={() => { setTradeTab("buy"); setQty(1); setError(""); }}
                  className={`w-1/2 pb-2 text-xs font-bold text-center border-b-2 transition ${
                    tradeTab === "buy" ? "border-indigo-600 text-indigo-650" : "border-transparent text-slate-400"
                  }`}
                >
                  Comprar
                </button>
                <button
                  type="button"
                  disabled={currentOwned === 0}
                  onClick={() => { setTradeTab("sell"); setQty(1); setError(""); }}
                  className={`w-1/2 pb-2 text-xs font-bold text-center border-b-2 transition disabled:opacity-40 ${
                    tradeTab === "sell" ? "border-red-500 text-red-600" : "border-transparent text-slate-400"
                  }`}
                >
                  Vender {currentOwned > 0 && `(${currentOwned})`}
                </button>
              </div>

              <form onSubmit={handleTradeSubmit} className="space-y-4">
                <div className="bg-slate-50 p-3 rounded-sm space-y-1 text-xs text-slate-500">
                  <div className="flex justify-between">
                    <span>Preço unitário:</span>
                    <span className="font-bold text-slate-800">R$ {selectedStock.regularMarketPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Saldo disponível:</span>
                    <span className="font-bold text-slate-800">
                      R$ {user.saldoVirtual.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1">
                    Quantidade
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={tradeTab === "sell" ? currentOwned : 99999}
                    className="w-full px-3 py-2 border border-slate-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-semibold"
                    value={qty}
                    onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                </div>

                <div className="flex justify-between items-center bg-indigo-50/50 p-3 rounded-sm border border-indigo-100 text-xs">
                  <span className="font-bold text-indigo-850">Total geral:</span>
                  <span className="font-black text-indigo-850 text-sm">
                    R$ {totalCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <button
                  type="submit"
                  className={`w-full font-bold py-2.5 rounded-sm text-xs shadow-md transition ${
                    tradeTab === "buy"
                      ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                      : "bg-red-650 hover:bg-red-700 text-white"
                  }`}
                >
                  Confirmar {tradeTab === "buy" ? "Compra" : "Venda"}
                </button>
              </form>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
