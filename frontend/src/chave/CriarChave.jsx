/**
 * Assistente para criar uma chave digital (do usuário ou do administrador):
 * 1. Senhas: a senha da conta (só para usuário) e a senha que vai proteger o arquivo da chave.
 * 2. A chave é gerada no navegador e só a parte pública vai para o servidor (onRegistrar).
 * 3. A pessoa baixa o arquivo (para o pendrive) e anota as 12 palavras de recuperação.
 *    Só dá para fechar depois disso: sem o arquivo nem as palavras, a chave se perde.
 */

import { useState } from "react";
import { Download, KeyRound, ShieldAlert } from "lucide-react";
import { Button, inputClass, labelClass } from "../components/ui";
import { criarArquivo, gerarChave, impressaoDigital } from "./cripto";
import { baixarArquivo, carregarChave, lembrarArquivo } from "./sessao";

const SENHA_MINIMA = 8;

export default function CriarChave({ vaga = "usuario", dono, pedirSenhaConta = true, onRegistrar, onConcluir }) {
  const [etapa, setEtapa] = useState("senhas");
  const [senhaConta, setSenhaConta] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [lembrar, setLembrar] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState("");

  const [gerada, setGerada] = useState(null); // { frase, chavePublica, arquivo, chave }
  const [baixou, setBaixou] = useState(false);
  const [anotou, setAnotou] = useState(false);

  async function gerar(e) {
    e.preventDefault();
    setErro("");
    if (senha.length < SENHA_MINIMA) {
      setErro(`A senha da chave precisa ter pelo menos ${SENHA_MINIMA} caracteres.`);
      return;
    }
    if (senha !== confirmacao) {
      setErro("As duas senhas da chave não são iguais.");
      return;
    }
    setGerando(true);
    try {
      const { frase, semente, chavePublica } = gerarChave();
      const arquivo = await criarArquivo(semente, chavePublica, senha, dono);
      const chave = await onRegistrar({ semente, chavePublica, senhaConta });

      if (lembrar) lembrarArquivo(arquivo);
      // Chave pendente ainda não assina nada; só fica carregada quando já está ativa
      if (chave?.status === "ATIVA") carregarChave(vaga, semente, chavePublica);
      else semente.fill(0);

      setGerada({ frase, chavePublica, arquivo, chave });
      setSenha("");
      setConfirmacao("");
      setSenhaConta("");
      setEtapa("guardar");
    } catch (err) {
      setErro(err.message || "Não foi possível criar a chave.");
    } finally {
      setGerando(false);
    }
  }

  if (etapa === "guardar" && gerada) {
    const palavras = gerada.frase.split(" ");
    return (
      <div className="space-y-4">
        <p className="text-xs text-slate-500 leading-relaxed">
          Chave criada: <strong className="font-mono text-slate-700">{impressaoDigital(gerada.chavePublica)}</strong>.
          {gerada.chave?.status === "PENDENTE" && (
            <> Ela fica <strong>pendente</strong> até o administrador aprovar.</>
          )}
        </p>

        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-700">1. Baixe o arquivo e copie para o pendrive</p>
          <Button
            variant="secondary"
            icon={Download}
            onClick={() => { baixarArquivo(gerada.arquivo); setBaixou(true); }}
            className="w-full py-2.5"
          >
            {baixou ? "Baixar de novo" : "Baixar arquivo da chave"}
          </Button>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-700">2. Anote as 12 palavras de recuperação, na ordem</p>
          <ol className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {palavras.map((p, i) => (
              <li key={i} className="flex items-center gap-1.5 px-2 py-1.5 rounded-sm bg-slate-50 border border-slate-100 text-xs">
                <span className="text-[10px] font-bold text-slate-400 w-4 text-right">{i + 1}</span>
                <span className="font-mono font-bold text-slate-800">{p}</span>
              </li>
            ))}
          </ol>
          <p className="flex items-start gap-1.5 text-[11px] text-amber-700 font-semibold">
            <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-px" />
            Quem tiver essas palavras tem a sua chave. Guarde no papel, longe do computador, e não mostre a ninguém.
          </p>
        </div>

        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <input type="checkbox" checked={anotou} onChange={(e) => setAnotou(e.target.checked)} />
          Anotei as 12 palavras em um lugar seguro
        </label>

        <Button disabled={!baixou || !anotou} onClick={() => onConcluir?.(gerada.chave)} className="w-full py-2.5">
          Concluir
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={gerar} className="space-y-3">
      {pedirSenhaConta && (
        <div>
          <label htmlFor={`criar-senha-conta-${vaga}`} className={labelClass}>Senha da sua conta</label>
          <input
            id={`criar-senha-conta-${vaga}`}
            type="password"
            autoComplete="current-password"
            value={senhaConta}
            onChange={(e) => setSenhaConta(e.target.value)}
            className={inputClass}
          />
        </div>
      )}
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor={`criar-senha-${vaga}`} className={labelClass}>Senha da chave</label>
          <input
            id={`criar-senha-${vaga}`}
            type="password"
            autoComplete="new-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor={`criar-confirma-${vaga}`} className={labelClass}>Repita a senha</label>
          <input
            id={`criar-confirma-${vaga}`}
            type="password"
            autoComplete="new-password"
            value={confirmacao}
            onChange={(e) => setConfirmacao(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>
      <p className="text-[11px] text-slate-400 leading-snug">
        A senha da chave protege o arquivo que vai para o pendrive. Ela é diferente da senha da conta e não fica
        guardada em lugar nenhum: se esquecer, só as 12 palavras recuperam a chave.
      </p>
      <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
        <input type="checkbox" checked={lembrar} onChange={(e) => setLembrar(e.target.checked)} />
        Lembrar neste computador (o arquivo fica cifrado; a senha continua sendo pedida)
      </label>

      {erro && <p role="alert" className="text-xs font-bold text-red-700">{erro}</p>}

      <Button
        type="submit"
        icon={KeyRound}
        disabled={gerando || !senha || !confirmacao || (pedirSenhaConta && !senhaConta)}
        className="w-full py-2.5"
      >
        {gerando ? "Gerando a chave..." : "Gerar chave"}
      </Button>
    </form>
  );
}
