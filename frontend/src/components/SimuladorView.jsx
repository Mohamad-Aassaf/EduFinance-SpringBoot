import { useState } from "react";
import { api } from "../api";

export default function SimuladorView({ user, onClose, onSimulationSuccess }) {
  const [tipoInvestimento, setTipoInvestimento] = useState("Poupança");
  const [valorInicial, setValorInicial] = useState("");
  const [aporteMensal, setAporteMensal] = useState("");
  const [taxaAnual, setTaxaAnual] = useState("");
  const [tempoMeses, setTempoMeses] = useState("");
  const [resultado, setResultado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

      // Envia a simulação para o Spring Boot
      const data = await api.post("/api/simulacoes", payload);
      setResultado(data.simulacao);
      onSimulationSuccess(data.saldoAtualizado, data.medalhasDesbloqueadas);
    } catch (err) {
      setError(err.message || "Erro ao rodar simulação.");
    } finally {
      setLoading(false);
    }
  };

  const totalInvestido = (parseFloat(valorInicial) || 0) + (parseFloat(aporteMensal) || 0) * (parseInt(tempoMeses) || 0);
  const jurosRendidos = resultado ? resultado.valorFinal - totalInvestido : 0;

  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-sm max-w-xl w-full p-6 relative shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold text-xl"
        >
          ✕
        </button>

        <h2 className="text-2xl font-bold text-gray-800 mb-4">Simulador de Investimentos</h2>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center mb-4 font-semibold">
            {error}
          </div>
        )}

        {!resultado ? (
          <form onSubmit={handleSimulate} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700">Tipo de Investimento</label>
              <select
                value={tipoInvestimento}
                onChange={(e) => setTipoInvestimento(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              >
                <option value="Poupança">Poupança</option>
                <option value="Tesouro Selic">Tesouro Selic (Renda Fixa)</option>
                <option value="CDB Bancário">CDB Bancário</option>
                <option value="Ações da Bolsa">Ações da Bolsa (Renda Variável)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700">Aporte Inicial (R$)</label>
                <input
                  type="number"
                  required
                  placeholder="Ex: 1000"
                  value={valorInicial}
                  onChange={(e) => setValorInicial(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700">Aporte Mensal (R$)</label>
                <input
                  type="number"
                  required
                  placeholder="Ex: 200"
                  value={aporteMensal}
                  onChange={(e) => setAporteMensal(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700">Taxa de Juros Anual (%)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="Ex: 12"
                  value={taxaAnual}
                  onChange={(e) => setTaxaAnual(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700">Prazo (meses)</label>
                <input
                  type="number"
                  required
                  placeholder="Ex: 12"
                  value={tempoMeses}
                  onChange={(e) => setTempoMeses(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-sm transition disabled:opacity-50 mt-2"
            >
              {loading ? "Simulando..." : "Rodar Simulação"}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-sm space-y-3">
              <h3 className="font-bold text-gray-800 text-center border-b pb-2 mb-2">
                Resultado da Simulação
              </h3>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Valor Final Bruto:</span>
                <span className="font-bold text-gray-800 text-lg">
                  R$ {resultado.valorFinal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total Investido (Sem Juros):</span>
                <span className="font-semibold text-gray-700">
                  R$ {totalInvestido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-sm border-t pt-2">
                <span className="text-emerald-600 font-semibold">Total de Juros Rendidos:</span>
                <span className="font-bold text-emerald-600">
                  + R$ {jurosRendidos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Gráfico de barras simples feito com CSS/Divs para ser leve */}
            <div className="space-y-2 mt-4">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Comparativo Visual</h4>
              <div className="space-y-1">
                <div className="text-xs font-semibold text-gray-600">Total Investido</div>
                <div className="w-full bg-gray-200 h-4 rounded-full overflow-hidden">
                  <div
                    className="bg-slate-500 h-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (totalInvestido / resultado.valorFinal) * 100)}%` }}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-semibold text-emerald-600">Rendimento de Juros</div>
                <div className="w-full bg-gray-200 h-4 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (jurosRendidos / resultado.valorFinal) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setResultado(null)}
                className="w-1/2 bg-gray-250 hover:bg-gray-200 text-gray-700 font-bold py-2 rounded-sm transition"
              >
                Nova Simulação
              </button>
              <button
                onClick={onClose}
                className="w-1/2 bg-indigo-650 hover:bg-indigo-700 text-white font-bold py-2 rounded-sm transition"
              >
                Salvar e Fechar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
