/**
 * Cartão "Chave digital" do Perfil: criar, carregar, baixar uma cópia, revogar e
 * verificar os registros. Também mostra o histórico de chaves da conta.
 */

import { useEffect, useState } from "react";
import {
  Ban, CheckCircle2, Clock, Download, FileKey2, KeyRound, LogOut, ShieldCheck, Trash2,
} from "lucide-react";
import { api } from "../api";
import { toast } from "../motion";
import { Button, inputClass, labelClass } from "../components/ui";
import CarregarChave from "./CarregarChave";
import CriarChave from "./CriarChave";
import JanelaChave from "./JanelaChave";
import VerificarRegistros from "./VerificarRegistros";
import { impressaoDigital } from "./cripto";
import {
  arquivoLembrado, assinarCadastro, baixarArquivo, descarregarChave, esquecerArquivo, exportarArquivo,
  useChaveCarregada,
} from "./sessao";

const STATUS = {
  ATIVA: { texto: "Ativa", cor: "bg-emerald-100 text-emerald-800" },
  PENDENTE: { texto: "Aguardando aprovação", cor: "bg-amber-100 text-amber-800" },
  REVOGADA: { texto: "Revogada", cor: "bg-slate-100 text-slate-500" },
};

const formatarData = (d) => (d ? new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "");

export default function ChaveDigitalCard({ user }) {
  const [estado, setEstado] = useState(null); // resposta de /api/chaves/me
  const [janela, setJanela] = useState(null); // "criar" | "carregar" | "copia" | "revogar" | "verificar"
  const carregada = useChaveCarregada("usuario");
  const dono = { tipo: "usuario", usuarioId: user.id, nome: user.nome, email: user.email };
  const [lembrada, setLembrada] = useState(() => Boolean(arquivoLembrado(dono)));

  async function atualizar() {
    try {
      setEstado(await api.get("/api/chaves/me"));
    } catch (err) {
      console.error("Erro ao carregar a chave digital:", err);
    }
  }

  useEffect(() => {
    atualizar();
  }, [user.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fechar = () => {
    setJanela(null);
    setLembrada(Boolean(arquivoLembrado(dono)));
    atualizar();
  };

  const chave = estado?.chave;
  const ativa = chave?.status === "ATIVA";
  const estaCarregada = ativa && carregada?.chavePublica === chave.chavePublica;
  const jaTeveChave = (estado?.historico?.length ?? 0) > 0;
  const anteriores = (estado?.historico ?? []).filter((c) => c.id !== chave?.id);

  async function registrar({ semente, chavePublica, senhaConta }) {
    const { payload, assinatura } = assinarCadastro(semente, { tipo: "CHAVE_CADASTRADA", usuarioId: user.id, chavePublica });
    return api.post("/api/chaves", { senhaConta, payload, assinatura });
  }

  return (
    <div
      className="bg-white p-5 rounded-sm shadow-sm border border-slate-100 space-y-4"
      data-finbot-context="Chave digital: um par de chaves (como na blockchain) que assina as operações importantes da conta. A chave privada fica só com o usuário, num arquivo que pode ir para um pendrive, e o servidor guarda apenas a chave pública para conferir as assinaturas. Assim ninguém, nem o administrador, consegue alterar ou forjar uma operação sem ser descoberto."
    >
      <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex flex-wrap items-center gap-x-2">
        <KeyRound className="w-4 h-4" style={{ color: "var(--color-primary)" }} />
        Chave digital
        <span className="text-[10px] font-normal text-slate-400">— Assine suas operações como numa blockchain</span>
      </h3>

      {!estado ? (
        <p className="text-xs text-slate-400 animate-pulse">Carregando...</p>
      ) : !chave ? (
        <div className="space-y-3">
          <p className="text-xs text-slate-500 leading-relaxed">
            Com uma chave digital, suas compras, vendas e aulas concluídas passam a ser <strong>assinadas por você</strong>.
            A chave fica num arquivo que você guarda (no pendrive, por exemplo) e leva para outros computadores. Nem o
            administrador consegue alterar ou forjar uma operação sua sem que a verificação acuse.
          </p>
          {jaTeveChave && (
            <p className="text-[11px] text-amber-700 font-semibold">
              Como você já teve uma chave antes, a nova vai precisar da aprovação do administrador.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button icon={KeyRound} onClick={() => setJanela("criar")}>
              {jaTeveChave ? "Criar nova chave" : "Criar minha chave"}
            </Button>
            <Button variant="secondary" icon={ShieldCheck} onClick={() => setJanela("verificar")}>
              Verificar meus registros
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="font-mono text-sm font-bold text-slate-800">{impressaoDigital(chave.chavePublica)}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS[chave.status].cor}`}>
              {STATUS[chave.status].texto}
            </span>
            {ativa && (
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  estaCarregada ? "bg-indigo-100 text-indigo-800" : "bg-slate-100 text-slate-500"
                }`}
              >
                {estaCarregada ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                {estaCarregada ? "Carregada nesta sessão" : "Não carregada"}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            {chave.status === "PENDENTE"
              ? "O administrador precisa aprovar esta chave. Até lá, suas operações continuam sem assinatura."
              : "Compras, vendas e aulas concluídas exigem a sua assinatura. Para usar em outro computador, carregue o arquivo do pendrive ou digite as 12 palavras."}
          </p>

          <div className="flex flex-wrap gap-2">
            {ativa && !estaCarregada && (
              <Button icon={FileKey2} onClick={() => setJanela("carregar")}>Carregar chave</Button>
            )}
            {estaCarregada && (
              <>
                <Button variant="secondary" icon={Download} onClick={() => setJanela("copia")}>Baixar cópia do arquivo</Button>
                <Button variant="secondary" icon={LogOut} onClick={() => descarregarChave("usuario")}>Descarregar</Button>
              </>
            )}
            <Button variant="secondary" icon={ShieldCheck} onClick={() => setJanela("verificar")}>
              Verificar meus registros
            </Button>
            {lembrada && (
              <Button
                variant="ghost"
                icon={Trash2}
                onClick={() => { esquecerArquivo(dono); setLembrada(false); toast("Chave esquecida neste computador."); }}
              >
                Esquecer neste computador
              </Button>
            )}
            <Button variant="ghost" icon={Ban} onClick={() => setJanela("revogar")} className="text-red-600 hover:text-red-700">
              {chave.status === "PENDENTE" ? "Cancelar chave" : "Revogar chave"}
            </Button>
          </div>
        </div>
      )}

      {anteriores.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer font-bold text-slate-400 hover:text-slate-600">Chaves anteriores</summary>
          <ul className="mt-2 space-y-1.5">
            {anteriores.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-x-2 text-slate-500">
                <span className="font-mono">{impressaoDigital(c.chavePublica)}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${STATUS[c.status].cor}`}>{STATUS[c.status].texto}</span>
                <span className="text-[11px]">
                  {c.revogadaEm ? `${formatarData(c.revogadaEm)} · ${c.motivoRevogacao || ""}` : formatarData(c.criadaEm)}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {janela === "criar" && (
        <JanelaChave titulo="Criar chave digital" icone={KeyRound} onFechar={fechar} podeFechar={false}>
          <CriarChaveComCancelar dono={dono} onRegistrar={registrar} onConcluir={(c) => {
            toast(c?.status === "PENDENTE" ? "Chave criada. Agora ela espera a aprovação do administrador." : "Chave digital ativada.");
            fechar();
          }} onCancelar={fechar} />
        </JanelaChave>
      )}

      {janela === "carregar" && (
        <JanelaChave titulo="Carregar chave digital" icone={FileKey2} onFechar={fechar}>
          <CarregarChave
            vaga="usuario"
            dono={dono}
            esperada={chave?.chavePublica}
            onCarregada={() => { toast("Chave carregada."); fechar(); }}
          />
        </JanelaChave>
      )}

      {janela === "copia" && (
        <JanelaChave titulo="Baixar cópia do arquivo" icone={Download} onFechar={fechar}>
          <CopiaDoArquivo dono={dono} onPronto={fechar} />
        </JanelaChave>
      )}

      {janela === "revogar" && (
        <JanelaChave titulo={chave?.status === "PENDENTE" ? "Cancelar chave" : "Revogar chave"} icone={Ban} onFechar={fechar}>
          <RevogarChave onRevogada={() => { descarregarChave("usuario"); esquecerArquivo(dono); toast("Chave revogada."); fechar(); }} />
        </JanelaChave>
      )}

      {janela === "verificar" && <VerificarRegistros onFechar={fechar} />}
    </div>
  );
}

// Enquanto ainda está na etapa das senhas, dá para desistir; depois de gerar, só fecha ao concluir
function CriarChaveComCancelar({ onCancelar, ...props }) {
  const [gerou, setGerou] = useState(false);
  return (
    <div className="space-y-3">
      {!gerou && (
        <p className="text-xs text-slate-500 leading-relaxed">
          A chave é gerada aqui no navegador. Só a parte pública vai para o servidor; a chave privada fica no arquivo
          que você vai baixar e nas 12 palavras de recuperação.
        </p>
      )}
      <CriarChave {...props} onRegistrar={async (dados) => { const c = await props.onRegistrar(dados); setGerou(true); return c; }} />
      {!gerou && (
        <button type="button" onClick={onCancelar} className="w-full text-xs font-bold text-slate-400 hover:text-slate-600">
          Cancelar
        </button>
      )}
    </div>
  );
}

function CopiaDoArquivo({ dono, onPronto }) {
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState("");
  const [gerando, setGerando] = useState(false);

  async function baixar(e) {
    e.preventDefault();
    setErro("");
    if (senha.length < 8) return setErro("A senha precisa ter pelo menos 8 caracteres.");
    if (senha !== confirmacao) return setErro("As duas senhas não são iguais.");
    setGerando(true);
    try {
      baixarArquivo(await exportarArquivo("usuario", senha, dono));
      toast("Cópia da chave baixada.");
      onPronto();
    } catch (err) {
      setErro(err.message);
    } finally {
      setGerando(false);
    }
  }

  return (
    <form onSubmit={baixar} className="space-y-3">
      <p className="text-xs text-slate-500">
        Gera um novo arquivo da mesma chave, protegido por uma senha que você escolhe agora (pode ser outra).
      </p>
      <div>
        <label htmlFor="copia-senha" className={labelClass}>Senha do novo arquivo</label>
        <input id="copia-senha" type="password" autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} className={inputClass} />
      </div>
      <div>
        <label htmlFor="copia-confirma" className={labelClass}>Repita a senha</label>
        <input id="copia-confirma" type="password" autoComplete="new-password" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} className={inputClass} />
      </div>
      {erro && <p role="alert" className="text-xs font-bold text-red-700">{erro}</p>}
      <Button type="submit" icon={Download} disabled={gerando || !senha || !confirmacao} className="w-full py-2.5">
        {gerando ? "Gerando..." : "Baixar arquivo"}
      </Button>
    </form>
  );
}

function RevogarChave({ onRevogada }) {
  const [senhaConta, setSenhaConta] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function revogar(e) {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      await api.post("/api/chaves/revogar", { senhaConta });
      onRevogada();
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={revogar} className="space-y-3">
      <p className="text-xs text-slate-500 leading-relaxed">
        Use se perdeu o pendrive ou acha que alguém copiou sua chave. Depois de revogada, ela não assina mais nada; as
        operações assinadas antes continuam válidas. Uma chave nova vai precisar da aprovação do administrador.
      </p>
      <div>
        <label htmlFor="revogar-senha" className={labelClass}>Senha da sua conta</label>
        <input id="revogar-senha" type="password" autoComplete="current-password" value={senhaConta} onChange={(e) => setSenhaConta(e.target.value)} className={inputClass} />
      </div>
      {erro && <p role="alert" className="text-xs font-bold text-red-700">{erro}</p>}
      <Button type="submit" variant="danger" icon={Ban} disabled={enviando || !senhaConta} className="w-full py-2.5">
        {enviando ? "Revogando..." : "Revogar"}
      </Button>
    </form>
  );
}
