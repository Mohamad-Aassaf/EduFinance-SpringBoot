import { useState } from "react";
import { api } from "../api";
import { BookOpen, TrendingUp, Calculator, LineChart, Trophy, Bot, Sparkles } from "lucide-react";

export default function Login({ onLoginSuccess }) {
  const [step, setStep] = useState("login"); // "login" | "register" | "recover_request" | "recover_reset"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      if (step === "login") {
        const data = await api.post("/api/auth/signin", { email, password });
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.perfil));
        onLoginSuccess(data.perfil);
      } else if (step === "register") {
        const data = await api.post("/api/auth/signup", { email, password, name });
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.perfil));
        onLoginSuccess(data.perfil);
      } else if (step === "recover_request") {
        const data = await api.post("/api/auth/recuperar/solicitar", { email });
        setMessage(data.mensagem || "Código enviado com sucesso!");
        setStep("recover_reset");
      } else if (step === "recover_reset") {
        const data = await api.post("/api/auth/recuperar/redefinir", { email, codigo: code, novaSenha: newPassword });
        setMessage(data.mensagem || "Senha redefinida com sucesso! Acesse sua conta.");
        setStep("login");
        setPassword("");
      }
    } catch (err) {
      setError(err.message || "Ocorreu um erro. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setError("");
    setMessage("");
    setStep("login");
  };

  return (
    <div className="min-h-screen flex bg-white font-sans">
      {/* ── Lado Esquerdo: apresentação da plataforma (visível apenas em telas grandes) ── */}
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden text-white flex-col justify-between gap-10 p-12 xl:px-16"
        style={{ background: "var(--color-primary-dark)" }}
      >
        {/* Fundo: brilhos nas cores da paleta, grade sutil e um gráfico subindo */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 85% 10%, color-mix(in srgb, var(--color-accent) 35%, transparent), transparent 45%), radial-gradient(circle at 0% 100%, color-mix(in srgb, var(--color-primary) 45%, transparent), transparent 55%)",
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <svg className="absolute bottom-0 left-0 w-full h-48 pointer-events-none opacity-25" viewBox="0 0 600 200" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="login-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="white" stopOpacity="0.5" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0 170 L60 150 L120 158 L180 120 L240 128 L300 95 L360 102 L420 60 L480 70 L540 30 L600 18 L600 200 L0 200 Z" fill="url(#login-area)" />
          <path d="M0 170 L60 150 L120 158 L180 120 L240 128 L300 95 L360 102 L420 60 L480 70 L540 30 L600 18" fill="none" stroke="white" strokeWidth="3" />
        </svg>

        {/* Logo */}
        <div className="relative flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-sm bg-white/10 border border-white/20 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
          </div>
          <p className="text-2xl font-extrabold tracking-tight">
            Edu<span style={{ color: "var(--color-accent)" }}>Finance</span>
          </p>
        </div>

        {/* Chamada principal */}
        <div className="relative space-y-7 max-w-xl">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-white/10 border border-white/20">
              <Sparkles className="w-3.5 h-3.5" style={{ color: "var(--color-accent)" }} />
              Educação financeira gamificada
            </span>
            <h1 className="text-4xl xl:text-[2.75rem] font-black leading-[1.1] tracking-tight">
              Aprenda a investir <span style={{ color: "var(--color-accent)" }}>praticando</span>, sem arriscar o seu dinheiro.
            </h1>
            <p className="text-base text-white/70 leading-relaxed">
              Aulas curtas, um professor de IA e R$ 100 mil de saldo virtual para você testar tudo o que aprender.
            </p>
          </div>

          {/* Prévia de uma conversa com o FinBot (some em telas baixas para não apertar o resto) */}
          <div className="[@media(max-height:860px)]:hidden rounded-sm bg-white/10 border border-white/15 backdrop-blur-sm p-4 space-y-3 shadow-2xl">
            <div className="flex justify-end">
              <p className="text-xs font-semibold bg-white text-slate-800 rounded-sm rounded-br-none px-3 py-2 max-w-[80%]">
                O que é reserva de emergência?
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "var(--color-accent)" }}
              >
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="text-xs leading-relaxed bg-white/10 border border-white/10 rounded-sm rounded-tl-none px-3 py-2">
                <p className="font-bold text-[10px] uppercase tracking-wider text-white/60 mb-0.5">Professor FinBot</p>
                É um dinheiro guardado para imprevistos, de 3 a 6 meses dos seus gastos, num investimento seguro e fácil de resgatar. 💡
              </div>
            </div>
          </div>

          {/* Recursos */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: BookOpen, titulo: "Trilha de aulas", texto: "Lições rápidas com XP e conquistas" },
              { icon: Calculator, titulo: "Simulador", texto: "Juros compostos com taxas reais" },
              { icon: LineChart, titulo: "Mercado", texto: "Compre ações com saldo virtual" },
              { icon: Trophy, titulo: "Ranking", texto: "Dispute com amigos e colegas" },
            ].map(({ icon: Icon, titulo, texto }) => (
              <div key={titulo} className="flex items-start gap-3 rounded-sm bg-white/5 border border-white/10 p-3">
                <div className="w-9 h-9 rounded-sm bg-white/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold">{titulo}</p>
                  <p className="text-xs text-white/60 mt-0.5 leading-snug">{texto}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-[11px] text-white/50 font-medium">
          Projeto educacional: nenhum dinheiro real é investido na plataforma.
        </p>
      </div>

      {/* Lado Direito - Formulários */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-sm bg-white p-8 rounded-sm shadow-md border border-slate-100/60 space-y-5">
          <div className="text-center">
            <div className="lg:hidden mb-4">
              <h1 className="text-3xl font-extrabold">
                <span className="text-slate-800">Edu</span>
                <span style={{ color: "var(--color-accent)" }}>Finance</span>
              </h1>
            </div>
            <h2 className="text-xl font-extrabold text-slate-800">
              {step === "login" && "Entrar na conta"}
              {step === "register" && "Criar conta"}
              {step === "recover_request" && "Recuperar senha"}
              {step === "recover_reset" && "Definir nova senha"}
            </h2>
            <p className="text-xs text-slate-400 mt-1 font-semibold">
              {step === "login" && "Acesse sua plataforma de educação financeira"}
              {step === "register" && "Comece sua jornada de educação financeira"}
              {step === "recover_request" && "Digite seu e-mail para receber o código"}
              {step === "recover_reset" && "Digite o código de verificação e sua nova senha"}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-700 p-2.5 rounded-sm text-xs text-center font-bold">
              {error}
            </div>
          )}

          {message && (
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-2.5 rounded-sm text-xs text-center font-bold">
              {message}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {step === "register" && (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Nome</label>
                <input
                  type="text"
                  required
                  placeholder="Seu nome"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-sm bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition text-xs font-semibold text-slate-700"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}

            {(step === "login" || step === "register" || step === "recover_request") && (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Email</label>
                <input
                  type="email"
                  required
                  placeholder="seu@email.com"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-sm bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition text-xs font-semibold text-slate-700"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            )}

            {(step === "login" || step === "register") && (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Senha</label>
                  {step === "login" && (
                    <button
                      type="button"
                      onClick={() => { setError(""); setMessage(""); setStep("recover_request"); }}
                      className="text-[10px] font-bold hover:opacity-80 focus:outline-none"
                      style={{ color: "var(--color-primary)" }}
                    >
                      Esqueceu a senha?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  required
                  placeholder="********"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-sm bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition text-xs font-semibold text-slate-700"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            )}

            {step === "recover_reset" && (
              <>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Código de Verificação</label>
                  <input
                    type="text"
                    required
                    placeholder="Use o código 1234"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-sm bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition text-xs font-semibold text-slate-700"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Nova Senha</label>
                  <input
                    type="password"
                    required
                    placeholder="Nova senha de acesso"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-sm bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition text-xs font-semibold text-slate-700"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Botão de submissão — usa a cor primary da paleta */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-sm shadow-md font-bold transition duration-150 disabled:opacity-50 text-sm tracking-wide cursor-pointer hover:opacity-90"
              style={{ background: "var(--color-primary)", color: "var(--color-text-on-primary)" }}
            >
              {loading ? "Carregando..." :
                step === "login" ? "Entrar" :
                  step === "register" ? "Cadastrar" :
                    step === "recover_request" ? "Enviar Código" : "Redefinir Senha"}
            </button>
          </form>

          <div className="text-center">
            {step === "login" && (
              <button
                onClick={() => { setError(""); setMessage(""); setStep("register"); }}
                className="text-[10px] font-extrabold hover:underline"
                style={{ color: "var(--color-primary)" }}
              >
                Não tem conta? Cadastre-se
              </button>
            )}
            {step === "register" && (
              <button
                onClick={handleBackToLogin}
                className="text-[10px] font-extrabold hover:underline"
                style={{ color: "var(--color-primary)" }}
              >
                Já tem conta? Entre
              </button>
            )}
            {(step === "recover_request" || step === "recover_reset") && (
              <button
                onClick={handleBackToLogin}
                className="text-[10px] font-extrabold hover:underline"
                style={{ color: "var(--color-primary)" }}
              >
                Voltar para o login
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
