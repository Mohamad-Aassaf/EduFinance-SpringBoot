/**
 * BoasVindas.jsx — Apresentação para quem acabou de criar a conta
 *
 * Aparece por cima do app no primeiro acesso, até a pessoa terminar:
 * 1. O Professor FinBot se apresenta e explica as abas, em grupos (aprender, praticar, acompanhar)
 * 2. Pergunta introdutória: "O que é educação financeira?"
 * 3. A IA compara a resposta com uma resposta de referência e o FinBot dá o feedback
 *
 * Ao concluir, o backend marca boasVindasConcluidas e a apresentação não volta mais.
 * Pelo Perfil dá para rever tudo (revisao=true); quem já respondeu a pergunta pode pulá-la.
 *
 * O encerramento tem duas fases: "pronto" (check animado e barra de preparação) e
 * "saindo": o cartão se recolhe e a tela escura sobe como uma persiana, com uma sombra
 * e um filete de luz na borda de baixo, enquanto o app aparece por trás deslizando.
 */

import { useState } from "react";
import {
  Bot, LayoutDashboard, BookOpen, MessageSquare, Calculator, LineChart, ShieldCheck,
  Newspaper, Trophy, User, History, GraduationCap, Wallet, Flame, ArrowRight, ArrowLeft,
  CheckCircle2, AlertCircle, RotateCcw, Sparkles, Check, X, SkipForward,
} from "lucide-react";
import { api } from "../api";
import { Button } from "./ui";
import { Confetti } from "./Feedback";
import FundoMarca from "./FundoMarca";
import { isMotionEnabled } from "../motion";

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const PERGUNTA = "O que é educação financeira?";

// Passos de apresentação; depois deles vêm a pergunta e o feedback
const APRESENTACAO = [
  {
    id: "oi",
    titulo: "Boas-Vindas!",
    fala: (nome) =>
      `Olá, ${nome}! Eu sou o Professor FinBot, seu guia aqui no EduFinance. Aqui você aprende a cuidar do seu dinheiro e a investir do jeito mais seguro que existe: praticando sem arriscar nada. Deixa eu te mostrar como tudo funciona!`,
    destaques: [
      { icon: GraduationCap, titulo: "Aprenda", texto: "Aulas curtas e um professor de IA para tirar dúvidas." },
      { icon: Wallet, titulo: "Pratique", texto: "R$ 100 mil de saldo virtual para investir sem medo." },
      { icon: Flame, titulo: "Evolua", texto: "Ganhe XP, suba de nível e mantenha sua ofensiva." },
    ],
  },
  {
    id: "aprender",
    titulo: "Para aprender",
    fala: () => "Comece por aqui. São as abas onde você aprende o básico, no seu ritmo, e onde eu fico de plantão para as suas dúvidas.",
    abas: [
      { icon: LayoutDashboard, nome: "Dashboard", texto: "Seu resumo: nível, XP, conquistas, sua posição no ranking e um atalho para continuar de onde parou." },
      { icon: BookOpen, nome: "Trilha de Aprendizado", texto: "Aulas curtas com perguntas no final. Cada aula concluída pela primeira vez vale 20 XP." },
      { icon: MessageSquare, nome: "Professor FinBot", texto: "Sou eu! No modo Fechado respondo com a base do EduFinance; no Aberto, busco na web e mostro as fontes. E o meu botão flutuante explica qualquer parte da tela." },
    ],
  },
  {
    id: "praticar",
    titulo: "Para praticar",
    fala: () => "Aprendeu? Agora é hora de colocar a mão na massa. Aqui o dinheiro é de mentira, mas o aprendizado é de verdade.",
    abas: [
      { icon: Calculator, nome: "Simulador", texto: "Veja quanto o seu dinheiro rende com juros compostos usando as taxas reais do Banco Central, ou descubra quanto e por quanto tempo investir para chegar a uma meta." },
      { icon: LineChart, nome: "Mercado", texto: "Compre e venda ações da bolsa com o seu saldo virtual de R$ 100 mil." },
      { icon: ShieldCheck, nome: "Carteira", texto: "Acompanhe as ações que você comprou, quanto valem hoje e o seu lucro ou prejuízo." },
    ],
  },
  {
    id: "acompanhar",
    titulo: "Para acompanhar",
    fala: () => "Por último, as abas para se manter por dentro e ver o quanto você já evoluiu. Volte todo dia para não perder a sua ofensiva!",
    abas: [
      { icon: Newspaper, nome: "Notícias", texto: "O que está acontecendo na economia e no mercado." },
      { icon: Trophy, nome: "Ranking", texto: "Compare o seu XP com outros alunos da sua cidade, estado ou país, e crie grupos com os amigos." },
      { icon: User, nome: "Perfil", texto: "Sua foto, suas conquistas, o teste de perfil de investidor e as cores do app." },
      { icon: History, nome: "Histórico", texto: "Suas operações no Mercado e as conversas comigo." },
    ],
  },
];

const ETAPAS = [...APRESENTACAO.map((p) => p.id), "pergunta", "feedback"];

function FalaDoFinBot({ children, digitando = false }) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center shrink-0 shadow-md"
        style={{ background: "var(--color-primary)", color: "var(--color-text-on-primary)" }}
      >
        <Bot className="w-5 h-5 sm:w-6 sm:h-6" />
      </div>
      <div className="min-w-0 flex-1 bg-white border border-slate-100 rounded-sm rounded-tl-none px-4 py-3 shadow-sm animate-fade-in">
        <p className="text-[10px] font-extrabold uppercase tracking-wider mb-1" style={{ color: "var(--color-primary)" }}>
          Professor FinBot
        </p>
        {digitando ? (
          <div className="flex items-center gap-1.5 py-1.5" aria-label="O FinBot está escrevendo">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-2 h-2 rounded-full bg-slate-300 animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        ) : (
          <div className="text-sm text-slate-700 leading-relaxed">{children}</div>
        )}
      </div>
    </div>
  );
}

function NotaCircular({ nota }) {
  const cor = nota >= 7 ? "#10b981" : nota >= 4 ? "#f59e0b" : "#ef4444";
  const raio = 34;
  const circunferencia = 2 * Math.PI * raio;
  return (
    <div className="relative w-24 h-24 shrink-0">
      <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
        <circle cx="40" cy="40" r={raio} fill="none" stroke="currentColor" strokeWidth="7" className="text-slate-100" />
        <circle
          cx="40"
          cy="40"
          r={raio}
          fill="none"
          stroke={cor}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circunferencia}
          strokeDashoffset={circunferencia * (1 - nota / 10)}
          style={{ transition: "stroke-dashoffset 900ms ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black text-slate-800 leading-none">{nota}</span>
        <span className="text-[10px] font-bold text-slate-400">de 10</span>
      </div>
    </div>
  );
}

export default function BoasVindas({ user, onConcluir, onSaindo, revisao = false }) {
  const [etapa, setEtapa] = useState(0);
  const [fase, setFase] = useState("intro"); // "intro" | "pronto" | "saindo"
  const [resposta, setResposta] = useState("");
  const [avaliando, setAvaliando] = useState(false);
  const [avaliacao, setAvaliacao] = useState(null);
  const [concluindo, setConcluindo] = useState(false);
  const [erro, setErro] = useState("");

  const idEtapa = ETAPAS[etapa];
  const passo = APRESENTACAO.find((p) => p.id === idEtapa);
  const primeiroNome = user.nome.split(" ")[0];
  // Ao refazer pelo Perfil, quem já respondeu a pergunta pode pulá-la
  const podePularPergunta = revisao && user.perguntaIntroRespondida;

  const avancar = () => setEtapa((e) => Math.min(e + 1, ETAPAS.length - 1));
  const voltar = () => setEtapa((e) => Math.max(e - 1, 0));

  async function enviarResposta(e) {
    e.preventDefault();
    if (resposta.trim().length < 10) {
      setErro("Escreva pelo menos uma frase com as suas palavras.");
      return;
    }
    setErro("");
    setAvaliando(true);
    try {
      const data = await api.post("/api/boas-vindas/avaliar", { resposta: resposta.trim() });
      setAvaliacao(data);
      setEtapa(ETAPAS.indexOf("feedback"));
    } catch (err) {
      setErro(err.message || "Não consegui avaliar a sua resposta. Tente de novo.");
    } finally {
      setAvaliando(false);
    }
  }

  function responderDeNovo() {
    setAvaliacao(null);
    setEtapa(ETAPAS.indexOf("pergunta"));
  }

  // Encerramento: celebra, some com zoom e desfoque e só então libera o app
  async function sair(perfil, celebrar) {
    const animado = isMotionEnabled();
    if (celebrar) {
      setFase("pronto");
      await esperar(animado ? 1600 : 400);
    }
    setFase("saindo");
    await esperar(animado ? 350 : 0); // cartão se recolhendo
    onSaindo?.(); // o app começa a entrar enquanto a persiana sobe
    await esperar(animado ? 1150 : 0);
    onConcluir(perfil);
  }

  async function concluir() {
    setConcluindo(true);
    setErro("");
    try {
      const perfil = await api.post("/api/boas-vindas/concluir", {});
      sair(perfil, true);
    } catch (err) {
      setErro(err.message || "Não foi possível concluir. Tente de novo.");
      setConcluindo(false);
    }
  }

  return (
    <div
      className={`fixed inset-0 z-[60] ${fase === "saindo" ? "bv-persiana pointer-events-none" : ""}`}
      style={{ background: "var(--color-primary-dark)" }}
      role="dialog"
      aria-modal="true"
      aria-label="Boas-vindas ao EduFinance"
    >
      {/* Mesmo fundo do Login: brilhos da paleta, grade e gráfico subindo */}
      <FundoMarca idGradiente="boas-vindas-area" />

      {avaliacao?.nota >= 7 && fase === "intro" && <Confetti />}

      {/* Borda da persiana: filete de luz e sombra projetada sobre o app enquanto ela sobe */}
      {fase === "saindo" && (
        <>
          <div
            aria-hidden="true"
            className="absolute left-0 right-0 top-full h-40 pointer-events-none"
            style={{ background: "linear-gradient(to bottom, color-mix(in srgb, var(--color-primary-dark) 60%, transparent), transparent)" }}
          />
          <div
            aria-hidden="true"
            className="absolute left-0 right-0 bottom-0 h-[3px] pointer-events-none"
            style={{
              background: "linear-gradient(90deg, transparent, var(--color-accent), transparent)",
              boxShadow: "0 0 28px 4px var(--color-accent)",
            }}
          />
        </>
      )}

      <div className={`relative h-full overflow-y-auto overflow-x-hidden ${fase === "saindo" ? "bv-conteudo-saida" : ""}`}>
      <div className="min-h-full flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-2xl space-y-5">
          {/* Logo, progresso e (ao rever pelo Perfil) o botão de fechar */}
          <div className="flex items-center justify-between gap-4 text-white">
            <p className="text-xl font-extrabold">
              Edu<span style={{ color: "var(--color-accent)" }}>Finance</span>
            </p>
            <div className="flex items-center gap-4">
              {fase === "intro" && (
                <div className="flex items-center gap-1.5" aria-label={`Etapa ${etapa + 1} de ${ETAPAS.length}`}>
                  {ETAPAS.map((id, i) => (
                    <span
                      key={id}
                      className="h-1.5 rounded-full transition-all duration-300"
                      style={{
                        width: i === etapa ? 24 : 8,
                        background: i <= etapa ? "var(--color-accent)" : "rgba(255, 255, 255, 0.25)",
                      }}
                    />
                  ))}
                </div>
              )}
              {revisao && fase === "intro" && (
                <button
                  type="button"
                  onClick={() => sair(user, false)}
                  aria-label="Fechar a introdução"
                  title="Fechar"
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 border border-white/20 hover:bg-white/20 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-sm shadow-2xl border border-slate-100 p-5 md:p-7 space-y-5">
            {/* ── Encerramento ── */}
            {fase !== "intro" && (
              <div className="py-10 flex flex-col items-center text-center gap-5 animate-fade-in" aria-live="polite">
                <div
                  className="bv-check w-20 h-20 rounded-full flex items-center justify-center shadow-lg"
                  style={{ background: "var(--color-primary)", color: "var(--color-text-on-primary)" }}
                >
                  <Check className="w-10 h-10" strokeWidth={3} />
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Tudo pronto, {primeiroNome}!</h2>
                  <p className="text-sm text-slate-500 font-medium">Preparando a sua jornada no EduFinance...</p>
                </div>
                <div className="w-full max-w-xs h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="bv-barra h-full rounded-full" style={{ background: "var(--color-primary)" }} />
                </div>
              </div>
            )}

            {/* ── Apresentação ── */}
            {fase === "intro" && passo && (
              <div key={passo.id} className="space-y-5 animate-fade-in">
                <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">{passo.titulo}</h2>
                <FalaDoFinBot>{passo.fala(primeiroNome)}</FalaDoFinBot>

                {passo.destaques && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {passo.destaques.map(({ icon: Icon, titulo, texto }) => (
                      <div key={titulo} className="rounded-sm border border-slate-100 bg-slate-50 p-4 space-y-2">
                        <div
                          className="w-9 h-9 rounded-sm flex items-center justify-center"
                          style={{ background: "color-mix(in srgb, var(--color-primary) 14%, transparent)", color: "var(--color-primary)" }}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <p className="text-sm font-extrabold text-slate-800">{titulo}</p>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">{texto}</p>
                      </div>
                    ))}
                  </div>
                )}

                {passo.abas && (
                  <div className="space-y-2.5">
                    {passo.abas.map(({ icon: Icon, nome, texto }, i) => (
                      <div
                        key={nome}
                        className="flex items-start gap-3 rounded-sm border border-slate-100 p-3.5 animate-slide-up"
                        style={{ animationDelay: `${i * 80}ms`, animationFillMode: "backwards" }}
                      >
                        <div
                          className="w-9 h-9 rounded-sm flex items-center justify-center shrink-0"
                          style={{ background: "color-mix(in srgb, var(--color-primary) 14%, transparent)", color: "var(--color-primary)" }}
                        >
                          <Icon className="w-4.5 h-4.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-extrabold text-slate-800">{nome}</p>
                          <p className="text-xs text-slate-500 font-medium leading-relaxed mt-0.5">{texto}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 pt-1">
                  {etapa > 0 ? (
                    <Button variant="ghost" icon={ArrowLeft} onClick={voltar}>Voltar</Button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEtapa(ETAPAS.indexOf("pergunta"))}
                      className="text-xs font-bold text-slate-400 hover:text-slate-600"
                    >
                      Pular apresentação
                    </button>
                  )}
                  {idEtapa === "acompanhar" && podePularPergunta ? (
                    <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2">
                      <Button variant="outline" icon={RotateCcw} onClick={avancar} disabled={concluindo}>
                        Responder a pergunta de novo
                      </Button>
                      <Button onClick={concluir} disabled={concluindo} className="px-5 py-2.5">
                        {concluindo ? "Concluindo..." : "Pular pergunta e concluir"}
                        {!concluindo && <SkipForward className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                  ) : (
                    <Button onClick={avancar} className="px-5 py-2.5">
                      {idEtapa === "acompanhar" ? "Vamos lá" : "Próximo"}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
                {erro && idEtapa === "acompanhar" && (
                  <p role="alert" className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-sm p-2.5">{erro}</p>
                )}
              </div>
            )}

            {/* ── Pergunta introdutória ── */}
            {fase === "intro" && idEtapa === "pergunta" && (
              <form onSubmit={enviarResposta} className="space-y-5 animate-fade-in">
                <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Uma pergunta antes de começar</h2>
                <FalaDoFinBot digitando={avaliando}>
                  Quero saber de onde você está partindo. Me conta, com as suas palavras:{" "}
                  <strong>{PERGUNTA}</strong> Não precisa acertar tudo, eu vou te dar um retorno!
                </FalaDoFinBot>

                {avaliando ? (
                  <p className="text-xs text-slate-500 font-semibold text-center animate-pulse">
                    O FinBot está lendo a sua resposta. Isso pode levar alguns segundos...
                  </p>
                ) : (
                  <div>
                    <textarea
                      value={resposta}
                      onChange={(e) => setResposta(e.target.value)}
                      rows={5}
                      maxLength={1500}
                      autoFocus
                      placeholder="Para mim, educação financeira é..."
                      className="w-full px-3.5 py-3 border border-slate-200 rounded-sm text-sm font-medium text-slate-700 bg-white focus:outline-none resize-none"
                    />
                    <p className="text-[10px] text-slate-400 font-semibold text-right mt-1">{resposta.length}/1500</p>
                  </div>
                )}

                {erro && (
                  <p role="alert" className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-sm p-2.5">{erro}</p>
                )}

                <div className="flex items-center justify-between gap-3">
                  <Button variant="ghost" icon={ArrowLeft} onClick={voltar} disabled={avaliando}>Voltar</Button>
                  {podePularPergunta && !avaliando && (
                    <button
                      type="button"
                      onClick={concluir}
                      disabled={concluindo}
                      className="text-xs font-bold text-slate-400 hover:text-slate-600 ml-auto"
                    >
                      Pular pergunta
                    </button>
                  )}
                  <Button type="submit" disabled={avaliando || concluindo} className="px-5 py-2.5">
                    {avaliando ? "Avaliando..." : "Enviar resposta"}
                    {!avaliando && <Sparkles className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </form>
            )}

            {/* ── Feedback da IA ── */}
            {fase === "intro" && idEtapa === "feedback" && avaliacao && (
              <div className="space-y-5 animate-fade-in">
                <div className="flex items-center gap-5">
                  {avaliacao.nota !== null && avaliacao.nota !== undefined && <NotaCircular nota={avaliacao.nota} />}
                  <div className="min-w-0">
                    <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
                      {avaliacao.nota === null || avaliacao.nota === undefined
                        ? "Obrigado pela resposta!"
                        : avaliacao.nota >= 7
                          ? "Mandou bem!"
                          : avaliacao.nota >= 4
                            ? "Bom começo!"
                            : "Vamos aprender juntos!"}
                    </h2>
                    <p className="text-xs text-slate-500 font-semibold mt-1">
                      {avaliacao.avaliadoPorIa ? "Avaliação feita pela IA do Professor FinBot" : "A IA está fora do ar agora"}
                    </p>
                  </div>
                </div>

                <FalaDoFinBot>{avaliacao.feedback}</FalaDoFinBot>

                {(avaliacao.acertos || avaliacao.faltou) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {avaliacao.acertos && (
                      <div className={`rounded-sm border border-emerald-100 bg-emerald-50 p-3.5 ${avaliacao.faltou ? "" : "sm:col-span-2"}`}>
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" /> O que você acertou
                        </p>
                        <p className="text-xs text-emerald-900 font-medium mt-1.5 leading-relaxed">{avaliacao.acertos}</p>
                      </div>
                    )}
                    {avaliacao.faltou && (
                      <div
                        className={`rounded-sm border border-amber-100 bg-amber-50 p-3.5 text-center flex flex-col justify-center ${avaliacao.acertos ? "" : "sm:col-span-2"}`}
                      >
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 flex items-center justify-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5" /> O que faltou
                        </p>
                        <p className="text-xs text-amber-900 font-medium mt-1.5 leading-relaxed">{avaliacao.faltou}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="rounded-sm bg-slate-50 border border-slate-100 p-4 space-y-2">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Sua resposta</p>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed italic">"{resposta.trim()}"</p>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 pt-2">Uma resposta completa</p>
                  <p className="text-xs text-slate-700 font-medium leading-relaxed">{avaliacao.respostaReferencia}</p>
                </div>

                {erro && (
                  <p role="alert" className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-sm p-2.5">{erro}</p>
                )}

                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <Button variant="ghost" icon={RotateCcw} onClick={responderDeNovo} disabled={concluindo}>
                    Responder de novo
                  </Button>
                  <Button onClick={concluir} disabled={concluindo} className="px-5 py-2.5">
                    {concluindo ? "Entrando..." : "Começar minha jornada"}
                    {!concluindo && <ArrowRight className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
