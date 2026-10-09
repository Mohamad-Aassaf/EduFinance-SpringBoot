import { useState, useEffect, useMemo } from "react";
import { Calculator, DollarSign, TrendingUp, Calendar } from "lucide-react";
import { api } from "../api";
import ReactApexChart from "react-apexcharts";

// ─── Gera as séries mês a mês para o gráfico de área ─────────────────────────
function calcularSeriesProjecao({ valorInicial, aporteMensal, taxaAnual, tempoMeses }) {
  const taxaMensal = taxaAnual / 12.0 / 100.0;
  const serieInvestido = [];
  const serieTotal = [];
  const categorias = [];

  for (let mes = 0; mes <= tempoMeses; mes++) {
    const totalInvestido = valorInicial + aporteMensal * mes;

    let totalComJuros;
    if (taxaMensal === 0) {
      totalComJuros = totalInvestido;
    } else {
      const montanteInicial = valorInicial * Math.pow(1 + taxaMensal, mes);
      const montanteAportes =
        mes === 0 ? 0 : aporteMensal * ((Math.pow(1 + taxaMensal, mes) - 1) / taxaMensal);
      totalComJuros = montanteInicial + montanteAportes;
    }

    serieInvestido.push(parseFloat(totalInvestido.toFixed(2)));
    serieTotal.push(parseFloat(totalComJuros.toFixed(2)));
    categorias.push(`Mês ${mes}`);
  }

  return { serieInvestido, serieTotal, categorias };
}

export default function Simulador({ user, onUpdateUser }) {
  const [tipoInvestimento, setTipoInvestimento] = useState("Poupança");
  const [valorInicial, setValorInicial] = useState("");
  const [aporteMensal, setAporteMensal] = useState("");
  const [taxaAnual, setTaxaAnual] = useState("");
  const [tempoMeses, setTempoMeses] = useState("");
  const [resultado, setResultado] = useState(null);
  const [simulations, setSimulations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadSimulations() {
    try {
      const data = await api.get(`/api/simulacoes/usuario/${user.id}`);
      setSimulations(data);
    } catch (err) {
      console.error("Erro ao carregar simulações:", err);
    }
  }

  useEffect(() => {
    loadSimulations();
  }, [user.id]);

  const handleSimulate = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = {
        usuarioId: user.id,
        tipoInvestimento,
        valorInicial: parseFloat(valorInicial) || 0,
        aporteMensal: parseFloat(aporteMensal) || 0,
        taxaAnual: parseFloat(taxaAnual) || 0,
        tempoMeses: parseInt(tempoMeses) || 0,
      };

      const data = await api.post("/api/simulacoes", payload);
      setResultado(data.simulacao);
      onUpdateUser({ ...user, saldoVirtual: data.saldoAtualizado });
      loadSimulations();
    } catch (err) {
      setError(err.message || "Erro ao calcular simulação.");
    } finally {
      setLoading(false);
    }
  };

  const totalInvestido = resultado
    ? resultado.valorInicial + resultado.aporteMensal * resultado.tempoMeses
    : 0;
  const jurosRendidos = resultado ? resultado.valorFinal - totalInvestido : 0;

  // ─── Dados do gráfico ApexCharts ────────────────────────────────────────────
  const chartData = useMemo(() => {
    if (!resultado) return null;
    return calcularSeriesProjecao({
      valorInicial: resultado.valorInicial,
      aporteMensal: resultado.aporteMensal,
      taxaAnual: resultado.taxaAnual,
      tempoMeses: resultado.tempoMeses,
    });
  }, [resultado]);

  const chartSeries = chartData
    ? [
        { name: "Total Investido", data: chartData.serieInvestido },
        { name: "Com Juros Compostos", data: chartData.serieTotal },
      ]
    : [];

  const chartOptions = {
    chart: {
      type: "area",
      height: 280,
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: { enabled: true, speed: 600 },
      background: "transparent",
    },
    dataLabels: { enabled: false },
    stroke: { curve: "smooth", width: [2, 2.5] },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.45,
        opacityTo: 0.02,
        stops: [0, 90, 100],
      },
    },
    colors: ["#94a3b8", "#2563EB"],
    xaxis: {
      categories: chartData?.categorias || [],
      tickAmount: Math.min(resultado?.tempoMeses || 12, 12),
      labels: {
        style: { fontSize: "10px", colors: "#94a3b8", fontWeight: 600 },
        rotate: 0,
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        formatter: (val) =>
          "R$ " + val.toLocaleString("pt-BR", { maximumFractionDigits: 0 }),
        style: { fontSize: "10px", colors: "#94a3b8", fontWeight: 600 },
      },
    },
    tooltip: {
      y: {
        formatter: (val) =>
          "R$ " + val.toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
      },
      theme: "light",
    },
    legend: {
      position: "top",
      horizontalAlign: "right",
      fontSize: "11px",
      fontWeight: 700,
      labels: { colors: "#475569" },
      markers: { size: 5 },
    },
    grid: {
      borderColor: "#f1f5f9",
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
    },
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 flex items-center gap-2">
          <Calculator className="w-8 h-8" style={{ color: "#2563EB" }} />
          Simulador de Investimentos
        </h1>
        <p className="text-slate-500 mt-1">
          Faça projeções de juros compostos e compare diferentes modalidades.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-sm border border-red-150 text-center font-bold text-xs">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulário de Simulação */}
        <div
          className="bg-white p-6 rounded-sm shadow-sm border border-slate-100 lg:col-span-1 space-y-4"
          data-finbot-context="Formulário do Simulador de Investimentos. Aqui você configura: tipo de investimento (Poupança, Tesouro Selic, CDB, Ações), valor inicial, aporte mensal, taxa de juros anual e prazo. O simulador usa a fórmula de juros compostos para calcular quanto seu dinheiro vai crescer."
        >
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Parâmetros</h3>
          <form onSubmit={handleSimulate} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1">
                Tipo de Investimento
              </label>
              <select
                value={tipoInvestimento}
                onChange={(e) => setTipoInvestimento(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-semibold bg-white"
              >
                <option value="Poupança">Poupança</option>
                <option value="Tesouro Selic">Tesouro Selic (Renda Fixa)</option>
                <option value="CDB Bancário">CDB Bancário</option>
                <option value="Ações da Bolsa">Ações da Bolsa (Renda Variável)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1">
                Aporte Inicial (R$)
              </label>
              <input
                type="number"
                required
                placeholder="Ex: 5000"
                value={valorInicial}
                onChange={(e) => setValorInicial(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1">
                Aporte Mensal (R$)
              </label>
              <input
                type="number"
                required
                placeholder="Ex: 300"
                value={aporteMensal}
                onChange={(e) => setAporteMensal(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1">
                  Taxa Anual (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="Ex: 12.5"
                  value={taxaAnual}
                  onChange={(e) => setTaxaAnual(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-semibold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1">
                  Meses
                </label>
                <input
                  type="number"
                  required
                  placeholder="Ex: 24"
                  value={tempoMeses}
                  onChange={(e) => setTempoMeses(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-semibold"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-sm text-xs shadow-md transition disabled:opacity-50 mt-2"
            >
              {loading ? "Simulando..." : "Rodar Simulação"}
            </button>
          </form>
        </div>

        {/* Resultados e Histórico */}
        <div className="lg:col-span-2 space-y-6">
          {resultado ? (
            <div className="bg-white p-6 rounded-sm shadow-sm border border-slate-100 space-y-5">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Resultado da Projeção</h3>

              {/* Cards de resumo */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 p-4 rounded-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Valor Final Bruto</p>
                  <p className="text-xl font-black text-slate-800 mt-1">
                    R$ {resultado.valorFinal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="bg-slate-50 p-4 rounded-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Investido</p>
                  <p className="text-xl font-bold text-slate-700 mt-1">
                    R$ {totalInvestido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="bg-emerald-50 p-4 rounded-sm">
                  <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Juros Rendidos</p>
                  <p className="text-xl font-black text-emerald-600 mt-1">
                    + R$ {jurosRendidos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* ── Gráfico de Área ApexCharts ── */}
              <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Evolução Patrimonial — Mês a Mês
                </h4>
                <div className="rounded-sm overflow-hidden">
                  <ReactApexChart
                    options={chartOptions}
                    series={chartSeries}
                    type="area"
                    height={280}
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1 text-center italic">
                  Cinza = total aportado · Azul = valor com juros compostos acumulados
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-sm p-12 text-center text-slate-450 italic text-sm">
              Preencha os parâmetros e clique em Rodar Simulação para ver os resultados.
            </div>
          )}

          {/* Histórico */}
          <div className="bg-white p-6 rounded-sm shadow-sm border border-slate-100 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              Simulações Recentes
            </h3>
            {simulations.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-4">Nenhuma simulação registrada ainda.</p>
            ) : (
              <div className="space-y-2">
                {simulations.slice(0, 5).map((sim) => (
                  <div key={sim.id} className="flex justify-between items-center bg-slate-50/50 p-4 rounded-sm border border-slate-100 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                        <TrendingUp className="w-4 h-4 text-indigo-500" />
                      </div>
                      <div>
                        <p className="font-extrabold text-slate-850">{sim.tipoInvestimento}</p>
                        <p className="text-[10px] text-slate-450 font-medium mt-0.5">
                          Inicial: R$ {sim.valorInicial.toFixed(2)} • {sim.tempoMeses} meses a {sim.taxaAnual}% a.a.
                        </p>
                      </div>
                    </div>
                    <span className="font-black text-emerald-600 text-sm">
                      R$ {sim.valorFinal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
