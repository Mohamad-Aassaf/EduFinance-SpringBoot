/**
 * Cartão "Chave digital" do Perfil: criar, carregar, baixar uma cópia, revogar, trocar
 * (quando a chave foi perdida), exigir a chave no login e verificar os registros.
 *
 * Regras (o servidor confere todas):
 * - A primeira chave já nasce ativa; qualquer outra depois fica pendente até o admin aprovar.
 * - Revogar a chave ativa e ligar/desligar "exigir a chave para entrar" pedem a assinatura dela.
 * - Conta que já teve chave só opera assinando: sem chave ativa, compras, vendas e aulas ficam bloqueadas.
 */

import { useEffect, useState } from "react";
import {
  Ban, CheckCircle2, Clock, Download, FileKey2, KeyRound, Lock, LogOut, RefreshCw, ShieldAlert, ShieldCheck, Trash2,
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
  arquivoLembrado, assinarAcao, assinarCadastro, baixarArquivo, descarregarChave, esquecerArquivo, exportarArquivo,
  useChaveCarregada,
} from "./sessao";

const STATUS = {
  ATIVA: { texto: "Ativa", cor: "bg-emerald-100 text-emerald-800" },
  PENDENTE: { texto: "Aguardando aprovação", cor: "bg-amber-100 text-amber-800" },
  REVOGADA: { texto: "Revogada", cor: "bg-slate-100 text-slate-500" },
};

const formatarData = (d) => (d ? new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "");

export default function ChaveDigitalCard({ user, onUpdateUser }) {
  const [estado, setEstado] = useState(null); // resposta de /api/chaves/me
  const [janela, setJanela] = useState(null); // "criar" | "trocar" | "carregar" | "copia" | "revogar" | "cancelar" | "verificar"
  const [alterandoLogin, setAlterandoLogin] = useState(false);
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

  const ativa = estado?.chave;
  const pendente = estado?.pendente;
  const estaCarregada = ativa && carregada?.chavePublica === ativa.chavePublica;
  const bloqueada = estado && !ativa && estado.contaUsaChave;
  const exibidas = new Set([ativa?.id, pendente?.id]);
  const anteriores = (estado?.historico ?? []).filter((c) => !exibidas.has(c.id));

  async function registrar({ semente, chavePublica, senhaConta }) {
    const { payload, assinatura } = assinarCadastro(semente, { tipo: "CHAVE_CADASTRADA", usuarioId: user.id, chavePublica });
    return api.post("/api/chaves", { senhaConta, payload, assinatura });
  }

  async function alternarExigirNoLogin() {
    setAlterandoLogin(true);
    try {
      const novo = !estado.exigirChaveLogin;
      const assinatura = await assinarAcao(user, "CONFIG_EXIGIR_CHAVE", { ativo: novo });
      const perfil = await api.post("/api/chaves/exigir-login", { assinatura });
      onUpdateUser?.(perfil);
      toast(novo ? "Agora sua conta só entra com a chave digital." : "Login com senha liberado de novo.");
      await atualizar();
    } catch (err) {
      toast(err.message || "Não foi possível alterar.", "error");
    } finally {
      setAlterandoLogin(false);
    }
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
      ) : (
        <>
          {/* ── Sem chave nenhuma ── */}
          {!ativa && !pendente && !bloqueada && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 leading-relaxed">
                Com uma chave digital, suas compras, vendas e aulas concluídas passam a ser <strong>assinadas por você</strong>.
                A chave fica num arquivo que você guarda (no pendrive, por exemplo) e leva para outros computadores. Nem o
                administrador consegue alterar ou forjar uma operação sua sem que a verificação acuse.
              </p>
              <p className="text-[11px] text-slate-400">
                Depois de criar, a conta passa a operar só com assinatura. Trocar de chave exige aprovação do administrador.
              </p>
              <Button icon={KeyRound} onClick={() => setJanela("criar")}>Criar minha chave</Button>
            </div>
          )}

          {/* ── Já teve chave, mas está sem nenhuma ativa ── */}
          {bloqueada && (
            <div className="p-3 rounded-sm border border-red-200 bg-red-50 text-xs text-red-800 space-y-2">
              <p className="font-extrabold flex items-center gap-1.5"><Lock className="w-4 h-4" /> Operações bloqueadas</p>
              <p>
                Sua conta usa chave digital, mas está sem chave ativa. Compras, vendas e aulas só voltam a funcionar
                quando o administrador aprovar uma chave nova.
              </p>
              {!pendente && (
                <Button icon={KeyRound} onClick={() => setJanela("trocar")}>Criar nova chave</Button>
              )}
            </div>
          )}

          {/* ── Chave ativa ── */}
          {ativa && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <span className="font-mono text-sm font-bold text-slate-800">{impressaoDigital(ativa.chavePublica)}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS.ATIVA.cor}`}>{STATUS.ATIVA.texto}</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    estaCarregada ? "bg-indigo-100 text-indigo-800" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {estaCarregada ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                  {estaCarregada ? "Carregada nesta sessão" : "Não carregada"}
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Compras, vendas e aulas concluídas exigem a sua assinatura. Para usar em outro computador, carregue o
                arquivo do pendrive ou digite as 12 palavras.
              </p>

              <div className="flex flex-wrap gap-2">
                {!estaCarregada && <Button icon={FileKey2} onClick={() => setJanela("carregar")}>Carregar chave</Button>}
                {estaCarregada && (
                  <>
                    <Button variant="secondary" icon={Download} onClick={() => setJanela("copia")}>Baixar cópia do arquivo</Button>
                    <Button variant="secondary" icon={LogOut} onClick={() => descarregarChave("usuario")}>Descarregar</Button>
                  </>
                )}
                {lembrada && (
                  <Button
                    variant="ghost"
                    icon={Trash2}
                    onClick={() => { esquecerArquivo(dono); setLembrada(false); toast("Chave esquecida neste computador."); }}
                  >
                    Esquecer neste computador
                  </Button>
                )}
              </div>

              {/* Exigir a chave para entrar */}
              <div className="flex items-start justify-between gap-3 p-3 rounded-sm border border-slate-100 bg-slate-50/50">
                <div className="text-xs">
                  <p className="font-bold text-slate-700">Só entrar com a chave digital</p>
                  <p className="text-slate-500 mt-0.5">
                    Desliga o login por senha nesta conta. Quem descobrir sua senha não consegue entrar.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={Boolean(estado.exigirChaveLogin)}
                  aria-label="Só entrar com a chave digital"
                  disabled={alterandoLogin}
                  onClick={alternarExigirNoLogin}
                  className="mi-switch mt-0.5 disabled:opacity-50"
                />
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {!pendente && (
                  <Button variant="ghost" icon={RefreshCw} onClick={() => setJanela("trocar")}>Perdi minha chave / trocar</Button>
                )}
                <Button variant="ghost" icon={Ban} onClick={() => setJanela("revogar")} className="text-red-600 hover:text-red-700">
                  Revogar chave
                </Button>
              </div>
            </div>
          )}

          {/* ── Pedido de chave nova esperando o admin ── */}
          {pendente && (
            <div className="p-3 rounded-sm border border-amber-200 bg-amber-50/60 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-bold text-slate-800">{impressaoDigital(pendente.chavePublica)}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS.PENDENTE.cor}`}>{STATUS.PENDENTE.texto}</span>
              </div>
              <p className="text-xs text-amber-900">
                {ativa
                  ? "Quando o administrador aprovar, esta chave substitui a ativa (que deixa de valer)."
                  : "Quando o administrador aprovar, suas operações voltam a funcionar com esta chave."}
              </p>
              <Button variant="ghost" icon={Ban} onClick={() => setJanela("cancelar")} className="text-red-600">Cancelar pedido</Button>
            </div>
          )}

          <Button variant="secondary" icon={ShieldCheck} onClick={() => setJanela("verificar")}>Verificar meus registros</Button>
        </>
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

      {(janela === "criar" || janela === "trocar") && (
        <JanelaChave titulo={janela === "criar" ? "Criar chave digital" : "Pedir uma chave nova"} icone={KeyRound} onFechar={fechar} podeFechar={false}>
          <CriarChaveComCancelar
            aviso={janela === "trocar"
              ? "A chave nova fica pendente até o administrador aprovar. Quando ele aprovar, a chave antiga deixa de valer."
              : null}
            dono={dono}
            onRegistrar={registrar}
            onConcluir={(c) => {
              toast(c?.status === "PENDENTE" ? "Pedido enviado. Agora a chave espera a aprovação do administrador." : "Chave digital ativada.");
              fechar();
            }}
            onCancelar={fechar}
          />
        </JanelaChave>
      )}

      {janela === "carregar" && (
        <JanelaChave titulo="Carregar chave digital" icone={FileKey2} onFechar={fechar}>
          <CarregarChave
            vaga="usuario"
            dono={dono}
            esperada={ativa?.chavePublica}
            onCarregada={() => { toast("Chave carregada."); fechar(); }}
          />
        </JanelaChave>
      )}

      {janela === "copia" && (
        <JanelaChave titulo="Baixar cópia do arquivo" icone={Download} onFechar={fechar}>
          <CopiaDoArquivo dono={dono} onPronto={fechar} />
        </JanelaChave>
      )}

      {janela === "revogar" && ativa && (
        <JanelaChave titulo="Revogar chave" icone={Ban} onFechar={fechar}>
          <RevogarChave
            user={user}
            chave={ativa}
            onRevogada={() => { descarregarChave("usuario"); esquecerArquivo(dono); toast("Chave revogada."); fechar(); }}
            onPerdeu={() => setJanela("trocar")}
          />
        </JanelaChave>
      )}

      {janela === "cancelar" && (
        <JanelaChave titulo="Cancelar pedido de chave" icone={Ban} onFechar={fechar}>
          <CancelarPendente onCancelado={() => { toast("Pedido cancelado."); fechar(); }} />
        </JanelaChave>
      )}

      {janela === "verificar" && <VerificarRegistros onFechar={fechar} />}
    </div>
  );
}

// Enquanto ainda está na etapa das senhas, dá para desistir; depois de gerar, só fecha ao concluir
function CriarChaveComCancelar({ onCancelar, aviso, ...props }) {
  const [gerou, setGerou] = useState(false);
  return (
    <div className="space-y-3">
      {!gerou && (
        <p className="text-xs text-slate-500 leading-relaxed">
          A chave é gerada aqui no navegador. Só a parte pública vai para o servidor; a chave privada fica no arquivo
          que você vai baixar e nas 12 palavras de recuperação.
        </p>
      )}
      {!gerou && aviso && <p className="text-[11px] font-semibold text-amber-700">{aviso}</p>}
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

// Revogar a chave ativa exige assinar com ela; quem perdeu a chave vai para "pedir uma chave nova"
function RevogarChave({ user, chave, onRevogada, onPerdeu }) {
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function revogar() {
    setErro("");
    setEnviando(true);
    try {
      const assinatura = await assinarAcao(user, "CHAVE_REVOGADA", { chaveId: chave.id });
      await api.post("/api/chaves/revogar", { assinatura });
      onRevogada();
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500 leading-relaxed">
        Use se acha que alguém copiou sua chave. Para revogar, você assina com a própria chave. Depois disso, ela não
        assina mais nada (as operações assinadas antes continuam válidas) e a conta fica bloqueada para operações até o
        administrador aprovar uma chave nova.
      </p>
      <p className="flex items-start gap-1.5 text-[11px] text-amber-700 font-semibold">
        <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-px" />
        Perdeu o pendrive e as 12 palavras? Então não dá para assinar: peça uma chave nova, que substitui esta quando o
        administrador aprovar.
      </p>
      {erro && <p role="alert" className="text-xs font-bold text-red-700">{erro}</p>}
      <div className="flex flex-wrap gap-2">
        <Button variant="danger" icon={Ban} disabled={enviando} onClick={revogar}>
          {enviando ? "Revogando..." : "Assinar e revogar"}
        </Button>
        <Button variant="secondary" icon={RefreshCw} disabled={enviando} onClick={onPerdeu}>Perdi a chave</Button>
      </div>
    </div>
  );
}

function CancelarPendente({ onCancelado }) {
  const [senhaConta, setSenhaConta] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function cancelar(e) {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      await api.post("/api/chaves/cancelar-pendente", { senhaConta });
      onCancelado();
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={cancelar} className="space-y-3">
      <p className="text-xs text-slate-500">O pedido some e a chave pendente não poderá mais ser usada.</p>
      <div>
        <label htmlFor="cancelar-senha" className={labelClass}>Senha da sua conta</label>
        <input id="cancelar-senha" type="password" autoComplete="current-password" value={senhaConta} onChange={(e) => setSenhaConta(e.target.value)} className={inputClass} />
      </div>
      {erro && <p role="alert" className="text-xs font-bold text-red-700">{erro}</p>}
      <Button type="submit" variant="danger" icon={Ban} disabled={enviando || !senhaConta} className="w-full py-2.5">
        {enviando ? "Cancelando..." : "Cancelar pedido"}
      </Button>
    </form>
  );
}
