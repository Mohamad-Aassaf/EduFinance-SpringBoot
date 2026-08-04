import { useState } from "react";
import { api } from "../api";
import { BookOpen, TrendingUp, BarChart2 } from "lucide-react";

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
      {/* ── Lado Esquerdo: Branding (visível apenas em telas grandes) ── */}
      <div
        className="hidden lg:flex lg:w-1/2 text-white flex-col justify-center p-16 space-y-8"
        style={{ background: "var(--color-primary-dark)" }} // Azul escuro da paleta
      >
        <div>
          {/* Logo EduFinance */}
          <h1 className="text-4xl font-extrabold mb-4">
            <span className="text-white">Edu</span>
            <span style={{ color: "var(--color-accent)" }}>Finance</span>
          </h1>
          <p className="text-base text-blue-200 max-w-sm leading-relaxed">
            Aprenda a investir de forma inteligente com aulas gamificadas e simulações reais.
          </p>
        </div>

        {/* Lista de features */}
        <div className="space-y-6 pt-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-sm bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Trilhas de Aprendizado</h3>
              <p className="text-sm text-blue-200 mt-0.5">Aulas curtas no estilo Duolingo</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-sm bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Simulador de Investimentos</h3>
              <p className="text-sm text-blue-200 mt-0.5">Simule e visualize seus ganhos</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-sm bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
              <BarChart2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Gráficos Interativos</h3>
              <p className="text-sm text-blue-200 mt-0.5">Acompanhe a evolução dos investimentos</p>
            </div>
          </div>
        </div>
      </div>

      {/* Lado Direito - Formulários */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-sm bg-white p-8 rounded-sm shadow-md border border-slate-100/60 space-y-5">
          <div className="text-center">
            <div className="lg:hidden mb-4">
              <h1 className="text-3xl font-extrabold">
                <span className="text-blue-500">Edu</span>
                <span className="text-emerald-500">Finance</span>
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
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-sm bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition text-xs font-semibold text-slate-750"
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
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-sm bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition text-xs font-semibold text-slate-750"
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
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-800 focus:outline-none"
                    >
                      Esqueceu a senha?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  required
                  placeholder="********"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-sm bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition text-xs font-semibold text-slate-750"
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
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-sm bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition text-xs font-semibold text-slate-750"
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
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-sm bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition text-xs font-semibold text-slate-750"
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
                className="text-[10px] font-extrabold text-blue-600 hover:underline"
              >
                Não tem conta? Cadastre-se
              </button>
            )}
            {step === "register" && (
              <button
                onClick={handleBackToLogin}
                className="text-[10px] font-extrabold text-blue-600 hover:underline"
              >
                Já tem conta? Entre
              </button>
            )}
            {(step === "recover_request" || step === "recover_reset") && (
              <button
                onClick={handleBackToLogin}
                className="text-[10px] font-extrabold text-blue-600 hover:underline"
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
