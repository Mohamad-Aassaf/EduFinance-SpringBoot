/**
 * Simulador.jsx — Simulador de juros compostos
 *
 * Tem dois modos:
 * - Projeção: o usuário informa quanto vai investir e vê quanto terá no fim.
 * - Meta:     o usuário informa quanto quer juntar (ex.: R$ 30.000 para casar) e escolhe
 *             o que descobrir: informando o prazo, o simulador calcula o aporte mensal
 *             necessário; informando o aporte mensal, calcula em quanto tempo chega lá.
 *
 * A taxa vem do tipo de investimento escolhido: Poupança, Tesouro Selic e CDB usam as taxas
 * reais do Banco Central e Ações usam a média do Ibovespa buscada pelo Ollama (ver TaxasService
 * no backend). Em "Outra" o usuário digita a própria taxa.
 *
 * Uma simulação do histórico pode ser reaberta: o resultado volta à tela e o formulário
 * é preenchido com os mesmos dados, para rever ou editar e calcular de novo.
 *
 * As simulações são apenas projeções: ficam salvas no histórico, mas não mexem
 * no saldo virtual, que só muda com compras e vendas no Mercado.
 */

import { useState, useEffect, useMemo, useRef } from "react";
import { TrendingUp, Calendar, Target, Trash2, LineChart, Award, RotateCcw, X } from "lucide-react";
import { api } from "../api";
import ReactApexChart from "react-apexcharts";
import { Button, inputClass, labelClass } from "./ui";
import { useDarkMode, chartTheme } from "../theme";
import { toast } from "../motion";

const META_PREFIX = "Meta: ";
const OUTRA = "Outra";

// Tipos com taxa real buscada no backend; o texto da opção pode ser mais longo que o nome salvo
const TIPOS = [
  ["Poupança", "Poupança"],
  ["Tesouro Selic", "Tesouro Selic (Renda Fixa)"],
  ["CDB Bancário", "CDB Bancário (100% do CDI)"],
  ["Ações da Bolsa", "Ações da Bolsa (Renda Variável)"],
];
const ehTipoFixo = (tipo) => TIPOS.some(([id]) => id === tipo);

const pct = (valor) => valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "% ao ano";

const brl = (valor, casas = 2) =>
  "R$ " + valor.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

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

/*
 * Aporte mensal necessário para chegar à meta.
 *
 * É a fórmula dos juros compostos resolvida para o aporte:
 *   meta = inicial × (1+i)^n + aporte × ((1+i)^n − 1) / i
 * onde i é a taxa mensal (taxa anual ÷ 12, a mesma convenção da projeção).
 * O resultado é arredondado para cima nos centavos, para a meta não ficar faltando.
 */
function calcularAporteParaMeta({ valorMeta, valorInicial, taxaAnual, tempoMeses }) {
  const taxaMensal = taxaAnual / 12.0 / 100.0;
  const fator = Math.pow(1 + taxaMensal, tempoMeses);
  const faltante = valorMeta - valorInicial * fator;
  if (faltante <= 0) return 0; // o valor inicial sozinho já alcança a meta
  const aporte = taxaMensal === 0 ? faltante / tempoMeses : (faltante * taxaMensal) / (fator - 1);
  return Math.ceil(aporte * 100 - 1e-6) / 100;
}

/*
 * Em quantos meses o saldo chega à meta investindo um aporte mensal fixo.
 *
 * Avança mês a mês com a mesma conta da projeção (rende e depois recebe o aporte) e
 * devolve o primeiro mês em que o saldo alcança a meta, ou null se não chegar em 100 anos.
 */
function calcularPrazoParaMeta({ valorMeta, valorInicial, aporteMensal, taxaAnual }) {
  const taxaMensal = taxaAnual / 12.0 / 100.0;
  let saldo = valorInicial;
  for (let mes = 1; mes <= 1200; mes++) {
    saldo = saldo * (1 + taxaMensal) + aporteMensal;
    if (saldo >= valorMeta - 0.005) return mes; // tolerância dos centavos arredondados no backend
  }
  return null;
}

function formatarPrazo(meses) {
  const anos = Math.floor(meses / 12);
  const resto = meses % 12;
  const partes = [];
  if (anos > 0) partes.push(`${anos} ano${anos > 1 ? "s" : ""}`);
  if (resto > 0) partes.push(`${resto} ${resto > 1 ? "meses" : "mês"}`);
  return partes.join(" e ");
}

function Field({ label, children }) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      {children}
    </div>
  );
}

function ResultTile({ label, value, tone = "neutral" }) {
  const tones = {
    neutral: ["bg-slate-50", "text-slate-400", "text-slate-800"],
    positive: ["bg-emerald-50", "text-emerald-800", "text-emerald-600"],
  };
  const [bg, labelCls, valueCls] = tones[tone];
  return (
    <div className={`${bg} p-4 rounded-sm min-w-0`}>
      <p className={`text-[10px] font-bold uppercase tracking-wider ${labelCls}`}>{label}</p>
      <p className={`text-lg xl:text-xl font-black mt-1 break-words ${valueCls}`}>{value}</p>
    </div>
  );
}

export default function Simulador({ user }) {
  const [modo, setModo] = useState("projecao"); // "projecao" | "meta"

  // Campos compartilhados pelos dois modos
  const [valorInicial, setValorInicial] = useState("");
  const [tipoInvestimento, setTipoInvestimento] = useState("Poupança");
  const [taxaAnual, setTaxaAnual] = useState(""); // só usada em "Outra"
  const [prazo, setPrazo] = useState("");
  const [prazoUnidade, setPrazoUnidade] = useState("meses");

  // Só da projeção
  const [aporteMensal, setAporteMensal] = useState("");
  const [nomeOutra, setNomeOutra] = useState(""); // nome opcional do investimento em "Outra"

  // Taxas reais por tipo: { "Poupança": { taxaAnual, fonte, detalhe, estimativa }, ... }
  const [taxas, setTaxas] = useState(null);
  const [atualizandoAcoes, setAtualizandoAcoes] = useState(false);
  const [erroTaxas, setErroTaxas] = useState(false);

  // Só da meta
  const [nomeMeta, setNomeMeta] = useState("");
  const [valorMeta, setValorMeta] = useState("");
  const [calculoMeta, setCalculoMeta] = useState("aporte"); // "aporte" (quanto investir) | "prazo" (em quanto tempo)

  const [resultado, setResultado] = useState(null);
  const [meta, setMeta] = useState(null); // { nome, valor, calculo } quando o resultado veio do modo Meta
  const [novasMedalhas, setNovasMedalhas] = useState([]);
  const [simulations, setSimulations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reaberta, setReaberta] = useState(null); // simulação do histórico carregada no formulário
  const formRef = useRef(null);

  const dark = useDarkMode();
  const tema = chartTheme(dark);

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

  /*
   * Carrega as taxas reais. A de ações depende do Ollama e pode demorar: enquanto o backend
   * avisa que ainda está buscando, a lista é pedida de novo a cada 20 segundos.
   */
  useEffect(() => {
    let ativo = true;
    let timer;
    let tentativas = 0;
    async function carregarTaxas() {
      try {
        const data = await api.get("/api/simulacoes/taxas");
        if (!ativo) return;
        setTaxas(Object.fromEntries(data.taxas.map((t) => [t.tipo, t])));
        setAtualizandoAcoes(data.atualizandoAcoes);
        setErroTaxas(false);
        if (data.atualizandoAcoes && ++tentativas < 10) timer = setTimeout(carregarTaxas, 20000);
      } catch (err) {
        console.error("Erro ao carregar taxas:", err);
        if (ativo) setErroTaxas(true);
      }
    }
    carregarTaxas();
    return () => {
      ativo = false;
      clearTimeout(timer);
    };
  }, []);

  const taxaDoTipo = taxas?.[tipoInvestimento];

  const handleSimulate = async (e) => {
    e.preventDefault();
    setError("");

    let tempoMeses = (parseInt(prazo) || 0) * (prazoUnidade === "anos" ? 12 : 1);
    const inicial = parseFloat(valorInicial) || 0;
    const aporte = parseFloat(aporteMensal) || 0;
    const calculaPrazo = modo === "meta" && calculoMeta === "prazo";

    let taxa;
    if (tipoInvestimento === OUTRA) {
      taxa = parseFloat(taxaAnual) || 0;
    } else if (taxaDoTipo) {
      taxa = taxaDoTipo.taxaAnual;
    } else {
      setError("As taxas ainda não foram carregadas. Aguarde um instante ou escolha Outra para digitar a taxa.");
      return;
    }

    if (!calculaPrazo && (tempoMeses < 1 || tempoMeses > 1200)) {
      setError("Informe um prazo entre 1 mês e 100 anos.");
      return;
    }

    let payload;
    let metaAtual = null;
    if (modo === "meta") {
      const alvo = parseFloat(valorMeta) || 0;
      if (alvo <= 0) {
        setError("Informe o valor da meta.");
        return;
      }
      if (calculaPrazo) {
        if (inicial >= alvo) {
          setError("Você já tem o valor da meta! Não é preciso investir mais nada para chegar lá.");
          return;
        }
        tempoMeses = calcularPrazoParaMeta({ valorMeta: alvo, valorInicial: inicial, aporteMensal: aporte, taxaAnual: taxa });
        if (tempoMeses === null) {
          setError("Com esse aporte mensal a meta não é alcançada em 100 anos. Tente um aporte maior.");
          return;
        }
      }
      metaAtual = { nome: nomeMeta.trim() || "Minha meta", valor: alvo, calculo: calculoMeta };
      payload = {
        tipoInvestimento: META_PREFIX + metaAtual.nome,
        valorInicial: inicial,
        aporteMensal: calculaPrazo
          ? aporte
          : calcularAporteParaMeta({ valorMeta: alvo, valorInicial: inicial, taxaAnual: taxa, tempoMeses }),
        taxaAnual: taxa,
        tempoMeses,
        valorMeta: alvo,
        calculoMeta,
      };
    } else {
      payload = {
        tipoInvestimento: tipoInvestimento === OUTRA ? nomeOutra.trim() || OUTRA : tipoInvestimento,
        valorInicial: inicial,
        aporteMensal: aporte,
        taxaAnual: taxa,
        tempoMeses,
      };
    }

    setLoading(true);
    try {
      const data = await api.post("/api/simulacoes", payload);
      setResultado(data.simulacao);
      setMeta(metaAtual);
      setNovasMedalhas(data.medalhasDesbloqueadas || []);
      setReaberta(null);
      loadSimulations();
    } catch (err) {
      setError(err.message || "Erro ao calcular simulação.");
    } finally {
      setLoading(false);
    }
  };

  /*
   * Reabre uma simulação do histórico: mostra o resultado dela e preenche o formulário
   * com os mesmos dados. Calcular de novo cria uma simulação nova; a original fica no histórico.
   */
  function handleReabrir(sim) {
    const ehMeta = sim.tipoInvestimento.startsWith(META_PREFIX);
    setModo(ehMeta ? "meta" : "projecao");
    setValorInicial(String(sim.valorInicial));
    // Tipos conhecidos voltam com a taxa real de hoje; o resto (metas e taxas digitadas) volta em
    // "Outra" com a taxa que foi usada, já que a meta não guarda onde o dinheiro seria investido
    const tipoFixo = !ehMeta && ehTipoFixo(sim.tipoInvestimento);
    setTipoInvestimento(tipoFixo ? sim.tipoInvestimento : OUTRA);
    setTaxaAnual(String(sim.taxaAnual));
    setPrazo(String(sim.tempoMeses));
    setPrazoUnidade("meses");

    if (ehMeta) {
      const nome = sim.tipoInvestimento.slice(META_PREFIX.length);
      // Simulações antigas não guardavam o valor da meta; o valor final é a meta arredondada para cima
      const valor = sim.valorMeta ?? Math.floor(sim.valorFinal);
      // Simulações antigas também não guardavam o tipo de cálculo; todas calculavam o aporte
      const calculo = sim.calculoMeta ?? "aporte";
      setNomeMeta(nome);
      setValorMeta(String(valor));
      setCalculoMeta(calculo);
      if (calculo === "prazo") setAporteMensal(String(sim.aporteMensal));
      setMeta({ nome, valor, calculo });
    } else {
      setNomeOutra(tipoFixo || sim.tipoInvestimento === OUTRA ? "" : sim.tipoInvestimento);
      setAporteMensal(String(sim.aporteMensal));
      setMeta(null);
    }

    setResultado(sim);
    setNovasMedalhas([]);
    setError("");
    setReaberta(sim);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleDeleteSimulation(id) {
    try {
      await api.delete(`/api/simulacoes/${id}`);
      setSimulations((prev) => prev.filter((s) => s.id !== id));
      if (reaberta?.id === id) setReaberta(null);
      toast("Simulação apagada.");
    } catch (err) {
      setError(err.message || "Erro ao apagar simulação.");
    }
  }

  const totalInvestido = resultado
    ? resultado.valorInicial + resultado.aporteMensal * resultado.tempoMeses
    : 0;
  const jurosRendidos = resultado ? resultado.valorFinal - totalInvestido : 0;

  // Quanto seria preciso guardar por mês sem nenhum rendimento (comparação do modo Meta)
  const aporteSemJuros = resultado && meta
    ? Math.max(0, (meta.valor - resultado.valorInicial) / resultado.tempoMeses)
    : 0;
  // Quantos meses levaria sem nenhum rendimento (comparação do modo Meta calculando o prazo)
  const prazoSemJuros = resultado && meta && resultado.aporteMensal > 0
    ? Math.max(1, Math.ceil((meta.valor - resultado.valorInicial) / resultado.aporteMensal - 1e-9))
    : null;

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

  // A série principal acompanha a paleta escolhida no Perfil
  const corPrimaria =
    getComputedStyle(document.documentElement).getPropertyValue("--color-primary").trim() || "#2563EB";

  const chartOptions = {
    chart: {
      type: "area",
      height: 280,
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: { enabled: true, speed: 600 },
      background: "transparent",
    },
    theme: { mode: tema.mode },
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
    colors: ["#94a3b8", corPrimaria],
    xaxis: {
      categories: chartData?.categorias || [],
      tickAmount: Math.min(resultado?.tempoMeses || 12, 6),
      labels: {
        style: { fontSize: "10px", colors: tema.muted, fontWeight: 600 },
        rotate: 0,
        hideOverlappingLabels: true,
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
      tooltip: { enabled: false },
    },
    yaxis: {
      labels: {
        formatter: (val) => "R$ " + val.toLocaleString("pt-BR", { notation: "compact", maximumFractionDigits: 1 }),
        style: { fontSize: "10px", colors: tema.muted, fontWeight: 600 },
      },
    },
    // Linha tracejada na altura da meta
    annotations: meta
      ? {
          yaxis: [
            {
              y: meta.valor,
              borderColor: "#10b981",
              strokeDashArray: 5,
              label: {
                text: `Meta: ${brl(meta.valor, 0)}`,
                position: "left",
                textAnchor: "start",
                borderColor: "#10b981",
                style: { color: "#ffffff", background: "#10b981", fontSize: "10px", fontWeight: 700 },
              },
            },
          ],
        }
      : {},
    tooltip: {
      y: { formatter: (val) => brl(val) },
      theme: tema.mode,
    },
    legend: {
      position: "top",
      horizontalAlign: "right",
      fontSize: "11px",
      fontWeight: 700,
      labels: { colors: tema.text },
      markers: { size: 5 },
    },
    grid: {
      borderColor: tema.grid,
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
    },
  };

  const modoCls = (id) =>
    `flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-sm text-xs font-bold transition ${
      modo === id ? "shadow-sm" : "text-slate-500 hover:text-slate-700"
    }`;
  const modoStyle = (id) =>
    modo === id ? { background: "var(--color-primary)", color: "var(--color-text-on-primary)" } : undefined;

  return (
    <div className="px-4 md:px-8 pt-2 pb-8 space-y-6 animate-fade-in">

      {error && (
        <div role="alert" className="bg-red-50 text-red-700 p-3 rounded-sm border border-red-200 text-center font-bold text-xs">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulário de Simulação */}
        <div
          ref={formRef}
          className="bg-white p-4 md:p-6 rounded-sm shadow-sm border border-slate-100 lg:col-span-1 space-y-4 lg:self-start scroll-mt-4"
          data-finbot-context="Formulário do Simulador de Investimentos. No modo Projeção você escolhe o tipo de investimento (Poupança, Tesouro Selic e CDB usam as taxas reais do Banco Central; Ações usam a média do Ibovespa buscada na web; em Outra você digita a taxa), informa valor inicial, aporte mensal e prazo, e vê quanto o dinheiro vai crescer com juros compostos. No modo Meta você informa quanto quer juntar e escolhe o que descobrir: informando o prazo, o simulador calcula quanto precisa investir por mês; informando quanto pode investir por mês, ele calcula em quanto tempo você chega à meta. As simulações não alteram o saldo virtual."
        >
          {/* Seletor de modo */}
          <div className="flex bg-slate-100 p-1 rounded-sm" role="tablist" aria-label="Modo do simulador">
            <button type="button" role="tab" aria-selected={modo === "projecao"} className={modoCls("projecao")} style={modoStyle("projecao")} onClick={() => setModo("projecao")}>
              <LineChart className="w-3.5 h-3.5" />
              Projeção
            </button>
            <button type="button" role="tab" aria-selected={modo === "meta"} className={modoCls("meta")} style={modoStyle("meta")} onClick={() => setModo("meta")}>
              <Target className="w-3.5 h-3.5" />
              Meta
            </button>
          </div>

          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            {modo === "projecao"
              ? "Informe quanto vai investir e veja quanto terá no fim do prazo."
              : calculoMeta === "aporte"
                ? "Diga quanto quer juntar e em quanto tempo. O simulador calcula quanto investir por mês."
                : "Diga quanto quer juntar e quanto pode investir por mês. O simulador calcula em quanto tempo você chega lá."}
          </p>

          {reaberta && (
            <div className="bg-amber-100 rounded-sm p-3 flex items-start gap-2">
              <RotateCcw className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 font-medium flex-1 min-w-0">
                Você reabriu <strong>{reaberta.tipoInvestimento}</strong>. Altere o que quiser e calcule de novo; a
                simulação original continua no histórico.
              </p>
              <button
                type="button"
                onClick={() => setReaberta(null)}
                aria-label="Dispensar aviso"
                className="text-amber-700 hover:text-amber-900 shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <form onSubmit={handleSimulate} className="space-y-4">
            {modo === "meta" && (
              <>
                <Field label="Qual é a meta?">
                  <input
                    type="text"
                    required
                    maxLength={80}
                    placeholder="Ex: Casamento, viagem, carro..."
                    value={nomeMeta}
                    onChange={(e) => setNomeMeta(e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="Valor da meta (R$)">
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    placeholder="Ex: 30000"
                    value={valorMeta}
                    onChange={(e) => setValorMeta(e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="O que você quer descobrir?">
                  <div className="flex bg-slate-100 p-1 rounded-sm" role="radiogroup" aria-label="O que você quer descobrir?">
                    {[
                      ["aporte", "Quanto investir por mês"],
                      ["prazo", "Em quanto tempo chego lá"],
                    ].map(([id, texto]) => (
                      <button
                        key={id}
                        type="button"
                        role="radio"
                        aria-checked={calculoMeta === id}
                        onClick={() => setCalculoMeta(id)}
                        className={`flex-1 px-2 py-1.5 rounded-sm text-[11px] font-bold leading-tight transition ${
                          calculoMeta === id ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        {texto}
                      </button>
                    ))}
                  </div>
                </Field>
              </>
            )}

            <Field label={modo === "projecao" ? "Tipo de Investimento" : "Onde você vai investir?"}>
              <select
                value={tipoInvestimento}
                onChange={(e) => setTipoInvestimento(e.target.value)}
                className={inputClass}
              >
                {TIPOS.map(([id, texto]) => (
                  <option key={id} value={id}>{texto}</option>
                ))}
                <option value={OUTRA}>Outra (digitar a taxa)</option>
              </select>
            </Field>

            {modo === "projecao" && tipoInvestimento === OUTRA && (
              <Field label="Nome do investimento (opcional)">
                <input
                  type="text"
                  maxLength={80}
                  placeholder="Ex: LCI, Fundo imobiliário..."
                  value={nomeOutra}
                  onChange={(e) => setNomeOutra(e.target.value)}
                  className={inputClass}
                />
              </Field>
            )}

            <Field label={modo === "projecao" ? "Aporte Inicial (R$)" : "Quanto você já tem (R$)"}>
              <input
                type="number"
                required={modo === "projecao"}
                min="0"
                step="0.01"
                placeholder={modo === "projecao" ? "Ex: 5000" : "Ex: 2000 (opcional)"}
                value={valorInicial}
                onChange={(e) => setValorInicial(e.target.value)}
                className={inputClass}
              />
            </Field>

            {(modo === "projecao" || calculoMeta === "prazo") && (
              <Field label={modo === "projecao" ? "Aporte Mensal (R$)" : "Quanto você pode investir por mês (R$)"}>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  placeholder="Ex: 300"
                  value={aporteMensal}
                  onChange={(e) => setAporteMensal(e.target.value)}
                  className={inputClass}
                />
              </Field>
            )}

            {tipoInvestimento === OUTRA ? (
              <Field label="Taxa de juros anual (%)">
                <input
                  type="number"
                  required
                  min="0"
                  max="1000"
                  step="0.01"
                  placeholder="Ex: 12.5"
                  value={taxaAnual}
                  onChange={(e) => setTaxaAnual(e.target.value)}
                  className={inputClass}
                />
              </Field>
            ) : (
              <Field label="Taxa de juros anual">
                <div className="bg-slate-50 border border-slate-200 rounded-sm px-3 py-2.5">
                  {taxaDoTipo ? (
                    <>
                      <p className="text-sm font-black text-slate-800">{pct(taxaDoTipo.taxaAnual)}</p>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5 leading-snug">
                        {taxaDoTipo.estimativa ? "Estimativa (fonte indisponível no momento)" : `Fonte: ${taxaDoTipo.fonte}`}
                        {" · "}
                        {taxaDoTipo.detalhe}
                      </p>
                      {tipoInvestimento === "Ações da Bolsa" && atualizandoAcoes && (
                        <p className="text-[10px] text-amber-700 font-bold mt-1 animate-pulse">
                          Buscando a média atual do Ibovespa com o Ollama...
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-slate-500 font-medium">
                      {erroTaxas ? "Não foi possível carregar as taxas. Escolha Outra para digitar a taxa." : "Carregando taxa real..."}
                    </p>
                  )}
                </div>
              </Field>
            )}

            {(modo === "projecao" || calculoMeta === "aporte") && (
              <Field label={modo === "projecao" ? "Prazo" : "Em quanto tempo"}>
                <div className="flex gap-2">
                  <input
                    type="number"
                    required
                    min="1"
                    step="1"
                    placeholder={prazoUnidade === "anos" ? "Ex: 2" : "Ex: 24"}
                    value={prazo}
                    onChange={(e) => setPrazo(e.target.value)}
                    className={`${inputClass} flex-1 min-w-0`}
                  />
                  <select
                    value={prazoUnidade}
                    onChange={(e) => setPrazoUnidade(e.target.value)}
                    aria-label="Unidade do prazo"
                    className={`${inputClass} !w-auto`}
                  >
                    <option value="meses">meses</option>
                    <option value="anos">anos</option>
                  </select>
                </div>
              </Field>
            )}

            <Button type="submit" disabled={loading} className="w-full py-2.5 mt-2">
              {loading
                ? "Calculando..."
                : modo === "projecao"
                  ? "Rodar Simulação"
                  : calculoMeta === "aporte"
                    ? "Calcular quanto investir"
                    : "Calcular em quanto tempo"}
            </Button>
          </form>
        </div>

        {/* Resultados e Histórico */}
        <div className="lg:col-span-2 space-y-6 min-w-0">
          {novasMedalhas.length > 0 && (
            <div className="bg-amber-100 rounded-sm p-3 flex items-center gap-3">
              <Award className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="text-xs font-bold text-amber-800">
                Nova medalha desbloqueada: {novasMedalhas.join(", ")}
              </p>
            </div>
          )}

          {resultado ? (
            <div className="bg-white p-4 md:p-6 rounded-sm shadow-sm border border-slate-100 space-y-5">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                {meta && <Target className="w-4 h-4 text-emerald-500" />}
                {meta ? `Plano para a meta: ${meta.nome}` : "Resultado da Projeção"}
              </h3>

              {meta ? (
                <>
                  {/* Resposta principal do modo Meta */}
                  <div
                    className="rounded-sm p-5 border"
                    style={{
                      background: "color-mix(in srgb, var(--color-primary) 8%, transparent)",
                      borderColor: "color-mix(in srgb, var(--color-primary) 30%, transparent)",
                    }}
                  >
                    {meta.calculo === "prazo" ? (
                      <>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Você chega lá em
                        </p>
                        <p className="text-3xl font-black text-slate-800 mt-1 break-words">
                          {formatarPrazo(resultado.tempoMeses)}
                        </p>
                        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                          {resultado.aporteMensal > 0 ? (
                            <>Investindo <strong>{brl(resultado.aporteMensal)} por mês</strong></>
                          ) : (
                            <>Sem aportes mensais</>
                          )}
                          {resultado.valorInicial > 0 && <>, começando com {brl(resultado.valorInicial)}</>} e com
                          rendimento de <strong>{resultado.taxaAnual.toLocaleString("pt-BR")}% ao ano</strong>, você
                          junta <strong>{brl(resultado.valorFinal)}</strong> e passa da meta de {brl(meta.valor)}.
                        </p>
                      </>
                    ) : resultado.aporteMensal > 0 ? (
                      <>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Você precisa investir
                        </p>
                        <p className="text-3xl font-black text-slate-800 mt-1 break-words">
                          {brl(resultado.aporteMensal)} <span className="text-base font-bold text-slate-500">por mês</span>
                        </p>
                        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                          Assim você junta <strong>{brl(meta.valor)}</strong> em{" "}
                          <strong>{formatarPrazo(resultado.tempoMeses)}</strong>, com rendimento de{" "}
                          <strong>{resultado.taxaAnual.toLocaleString("pt-BR")}% ao ano</strong>
                          {resultado.valorInicial > 0 && <> e começando com {brl(resultado.valorInicial)}</>}.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-xl font-black text-slate-800">Você não precisa de aportes mensais</p>
                        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                          Os {brl(resultado.valorInicial)} que você já tem, rendendo{" "}
                          {resultado.taxaAnual.toLocaleString("pt-BR")}% ao ano, chegam a{" "}
                          <strong>{brl(resultado.valorFinal)}</strong> em {formatarPrazo(resultado.tempoMeses)} e
                          passam da meta de {brl(meta.valor)}.
                        </p>
                      </>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <ResultTile label="Total que sai do seu bolso" value={brl(totalInvestido)} />
                    <ResultTile label="Juros a seu favor" value={`+ ${brl(jurosRendidos)}`} tone="positive" />
                    {meta.calculo === "prazo" ? (
                      <ResultTile
                        label="Sem render nada, levaria"
                        value={prazoSemJuros ? formatarPrazo(prazoSemJuros) : "Não chegaria"}
                      />
                    ) : (
                      <ResultTile label="Sem render nada, seria" value={`${brl(aporteSemJuros)}/mês`} />
                    )}
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <ResultTile label="Valor Final Bruto" value={brl(resultado.valorFinal)} />
                  <ResultTile label="Total Investido" value={brl(totalInvestido)} />
                  <ResultTile label="Juros Rendidos" value={`+ ${brl(jurosRendidos)}`} tone="positive" />
                </div>
              )}

              {/* ── Gráfico de Área ApexCharts ── */}
              <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Evolução Patrimonial — Mês a Mês
                </h4>
                <div className="rounded-sm overflow-hidden">
                  <ReactApexChart
                    key={`${resultado.id}-${tema.mode}-${meta?.valor ?? ""}`}
                    options={chartOptions}
                    series={chartSeries}
                    type="area"
                    height={280}
                  />
                </div>
              </div>

              <p className="text-[10px] text-slate-400 italic">
                Projeção com taxa constante e juros mensais (taxa anual ÷ 12). Não considera impostos, taxas nem inflação,
                e não altera o seu saldo virtual.
              </p>
            </div>
          ) : (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-sm p-12 text-center text-slate-500 italic text-sm">
              {modo === "projecao"
                ? "Preencha os parâmetros e clique em Rodar Simulação para ver os resultados."
                : calculoMeta === "aporte"
                  ? "Defina a sua meta e clique em Calcular quanto investir."
                  : "Defina a sua meta e clique em Calcular em quanto tempo."}
            </div>
          )}

          {/* Histórico */}
          <div className="bg-white p-4 md:p-6 rounded-sm shadow-sm border border-slate-100 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              Simulações Recentes
              {simulations.length > 0 && (
                <span className="ml-auto text-xs font-medium text-slate-400">{simulations.length}</span>
              )}
            </h3>
            {simulations.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-4">Nenhuma simulação registrada ainda.</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {simulations.map((sim) => {
                  const ehMeta = sim.tipoInvestimento.startsWith(META_PREFIX);
                  const Icon = ehMeta ? Target : TrendingUp;
                  return (
                    <div
                      key={sim.id}
                      className={`flex items-center gap-2 sm:gap-3 bg-slate-50 p-3 rounded-sm border text-xs ${reaberta?.id === sim.id ? "border-indigo-500" : "border-slate-100"}`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-indigo-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-extrabold text-slate-800 truncate">{sim.tipoInvestimento}</p>
                        <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                          {ehMeta
                            ? `${brl(sim.aporteMensal)}/mês`
                            : `Inicial: ${brl(sim.valorInicial)}`}{" "}
                          • {sim.tempoMeses} meses a {sim.taxaAnual}% a.a.
                        </p>
                        {/* No celular o valor final vai para baixo, para o nome não ficar espremido */}
                        <p className="sm:hidden font-black text-emerald-600 text-sm mt-1">{brl(sim.valorFinal)}</p>
                      </div>
                      <span className="hidden sm:block font-black text-emerald-600 text-sm whitespace-nowrap">
                        {brl(sim.valorFinal)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleReabrir(sim)}
                        title="Rever ou editar esta simulação"
                        aria-label={`Rever ou editar a simulação ${sim.tipoInvestimento}`}
                        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-slate-400 hover:text-indigo-700 hover:bg-indigo-50 transition"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSimulation(sim.id)}
                        title="Apagar simulação"
                        aria-label={`Apagar simulação ${sim.tipoInvestimento}`}
                        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-slate-400 hover:text-red-500 hover:bg-red-50 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
