/**
 * Entrar com a chave digital, sem a senha da conta (desafio e resposta):
 * a pessoa escolhe o arquivo (do pendrive ou lembrado neste computador), digita a senha
 * da chave, o navegador assina o desafio do servidor e recebe o token.
 * A chave já fica carregada para assinar as operações dessa sessão.
 */

import { useRef, useState } from "react";
import { FileKey2, KeyRound } from "lucide-react";
import { api } from "../api";
import { abrirArquivo, impressaoDigital } from "./cripto";
import { arquivosLembradosDeUsuarios, assinarDesafioLogin, carregarChave, lembrarArquivo, lerArquivoDoDisco } from "./sessao";

const campoClass =
  "w-full px-3.5 py-2 border border-slate-200 rounded-sm bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition text-xs font-semibold text-slate-700";

export default function LoginComChave({ onEntrou }) {
  const lembrados = arquivosLembradosDeUsuarios();
  const [arquivo, setArquivo] = useState(lembrados[0] ?? null);
  const [senha, setSenha] = useState("");
  const [lembrar, setLembrar] = useState(false);
  const [erro, setErro] = useState("");
  const [entrando, setEntrando] = useState(false);
  const inputArquivo = useRef(null);

  async function escolherArquivo(e) {
    setErro("");
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const lido = await lerArquivoDoDisco(file);
      if (lido.tipo !== "usuario" || !lido.email) throw new Error("Esse arquivo não é a chave de um usuário.");
      setArquivo(lido);
    } catch (err) {
      setErro(err.message);
    }
  }

  async function entrar(e) {
    e.preventDefault();
    setErro("");
    setEntrando(true);
    try {
      const semente = await abrirArquivo(arquivo, senha);
      const { desafioId, mensagem } = await api.post("/api/auth/chave/desafio", { email: arquivo.email });
      const assinatura = assinarDesafioLogin(mensagem, arquivo.email, semente);
      const data = await api.post("/api/auth/chave/entrar", { desafioId, assinatura });

      if (lembrar) lembrarArquivo(arquivo);
      carregarChave("usuario", semente, arquivo.chavePublica);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.perfil));
      onEntrou(data.perfil);
    } catch (err) {
      setErro(err.message || "Não foi possível entrar com a chave.");
    } finally {
      setEntrando(false);
    }
  }

  return (
    <form onSubmit={entrar} className="space-y-4">
      {erro && (
        <div role="alert" className="bg-red-50 border border-red-100 text-red-700 p-2.5 rounded-sm text-xs text-center font-bold">
          {erro}
        </div>
      )}

      {lembrados.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Chaves neste computador</p>
          {lembrados.map((a) => (
            <button
              key={a.chavePublica}
              type="button"
              onClick={() => setArquivo(a)}
              className={`w-full flex items-center gap-3 p-2.5 rounded-sm border text-left transition ${
                arquivo?.chavePublica === a.chavePublica ? "border-blue-500 bg-blue-50/50" : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <KeyRound className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="min-w-0">
                <span className="block text-xs font-bold text-slate-700 truncate">{a.nome || a.email}</span>
                <span className="block text-[10px] text-slate-400 truncate">{a.email} · {impressaoDigital(a.chavePublica)}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      <input ref={inputArquivo} type="file" accept=".json,application/json" onChange={escolherArquivo} className="hidden" />
      <button
        type="button"
        onClick={() => inputArquivo.current?.click()}
        className="w-full flex items-center gap-3 p-3 rounded-sm border-2 border-dashed border-slate-200 hover:border-slate-300 text-left transition"
      >
        <FileKey2 className="w-5 h-5 text-slate-400 shrink-0" />
        <span className="min-w-0">
          <span className="block text-xs font-bold text-slate-700 truncate">
            {arquivo && !lembrados.some((a) => a.chavePublica === arquivo.chavePublica)
              ? `${arquivo.email} · ${impressaoDigital(arquivo.chavePublica)}`
              : "Escolher arquivo da chave (pendrive)"}
          </span>
          <span className="block text-[10px] text-slate-400">edufinance-chave-….json</span>
        </span>
      </button>

      <div>
        <label htmlFor="login-senha-chave" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
          Senha da chave
        </label>
        <input
          id="login-senha-chave"
          type="password"
          autoComplete="off"
          placeholder="********"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className={campoClass}
        />
      </div>

      {arquivo && !lembrados.some((a) => a.chavePublica === arquivo.chavePublica) && (
        <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
          <input type="checkbox" checked={lembrar} onChange={(e) => setLembrar(e.target.checked)} />
          Lembrar esta chave neste computador
        </label>
      )}

      <button
        type="submit"
        disabled={entrando || !arquivo || !senha}
        className="w-full py-3 px-4 rounded-sm shadow-md font-bold transition duration-150 disabled:opacity-50 text-sm tracking-wide hover:opacity-90 flex items-center justify-center gap-2"
        style={{ background: "var(--color-primary)", color: "var(--color-text-on-primary)" }}
      >
        <KeyRound className="w-4 h-4" />
        {entrando ? "Assinando..." : "Entrar com a chave"}
      </button>
    </form>
  );
}
