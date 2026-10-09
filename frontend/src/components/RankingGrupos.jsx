/**
 * RankingGrupos.jsx — Grupos de ranking (competição entre conhecidos)
 *
 * Duas telas:
 * - Lista:   meus grupos, busca de grupos, criar grupo e entrar com código
 * - Detalhe: classificação do grupo, convite e administração de membros
 *
 * Tipos de acesso de um grupo:
 * - ABERTO:  aparece na busca e qualquer um entra
 * - SENHA:   aparece na busca, mas pede a senha (o convite dispensa a senha)
 * - CONVITE: não aparece na busca; só entra com o código de convite
 *
 * As permissões são conferidas no backend. Aqui os botões só são escondidos
 * de quem não pode usá-los.
 */

import { useState, useEffect, useCallback } from "react";
import {
  Plus, KeyRound, Lock, Globe, Mail, Users, Search, ArrowLeft, Copy, Link2, Pencil, Trash2,
  LogOut, RefreshCw, ShieldCheck, ShieldOff, UserMinus, ChevronLeft, ChevronRight, Trophy, CheckCircle, AlertCircle,
} from "lucide-react";
import { api } from "../api";
import { Card, Button, EmptyState, IconButton, Modal, Avatar, inputClass, labelClass } from "./ui";
import { METRICAS, ICONES_GRUPO, IconeGrupo, RankingTabela, mensagemDeErro } from "./rankingShared";

const ACESSOS = {
  ABERTO: { label: "Aberto", icon: Globe, descricao: "Aparece na busca e qualquer pessoa pode entrar." },
  SENHA: { label: "Com senha", icon: Lock, descricao: "Aparece na busca, mas só entra quem souber a senha ou tiver o convite." },
  CONVITE: { label: "Só por convite", icon: Mail, descricao: "Não aparece na busca. Só entra quem receber o código de convite." },
};

function SeloAcesso({ acesso }) {
  const info = ACESSOS[acesso] || ACESSOS.ABERTO;
  const Icon = info.icon;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold whitespace-nowrap">
      <Icon className="w-3 h-3" /> {info.label}
    </span>
  );
}

const linkDoConvite = (codigo) => `${window.location.origin}${window.location.pathname}?convite=${codigo}`;

async function copiar(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    return false;
  }
}

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────
export default function RankingGrupos({ user, convite, onConviteUsado, onVerPerfil }) {
  const [grupoAberto, setGrupoAberto] = useState(null);   // id do grupo em detalhe
  const [meus, setMeus] = useState(null);
  const [erroMeus, setErroMeus] = useState("");
  const [descobertos, setDescobertos] = useState(null);
  const [erroDescobrir, setErroDescobrir] = useState("");
  const [busca, setBusca] = useState("");
  const [buscaAplicada, setBuscaAplicada] = useState("");
  const [pagina, setPagina] = useState(0);
  const [versao, setVersao] = useState(0);                 // muda para recarregar as listas

  const [criando, setCriando] = useState(false);
  const [pedindoSenha, setPedindoSenha] = useState(null);  // grupo que pede senha
  const [previaConvite, setPreviaConvite] = useState(null);
  const [codigo, setCodigo] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState(null);                // { tipo: "ok" | "erro", texto }

  const avisar = useCallback((tipo, texto) => setAviso({ tipo, texto }), []);
  const recarregar = useCallback(() => setVersao((v) => v + 1), []);

  // O aviso some sozinho depois de alguns segundos
  useEffect(() => {
    if (!aviso) return;
    const timer = setTimeout(() => setAviso(null), 5000);
    return () => clearTimeout(timer);
  }, [aviso]);

  // Meus grupos
  useEffect(() => {
    let ativo = true;
    api.get("/api/grupos/meus")
      .then((lista) => { if (ativo) { setMeus(lista); setErroMeus(""); } })
      .catch((err) => ativo && setErroMeus(mensagemDeErro(err)));
    return () => { ativo = false; };
  }, [versao]);

  // Busca de grupos (espera o usuário parar de digitar)
  useEffect(() => {
    const timer = setTimeout(() => { setBuscaAplicada(busca.trim()); setPagina(0); }, 350);
    return () => clearTimeout(timer);
  }, [busca]);

  useEffect(() => {
    let ativo = true;
    const params = new URLSearchParams({ pagina, tamanho: 6 });
    if (buscaAplicada) params.set("busca", buscaAplicada);
    api.get(`/api/grupos/descobrir?${params}`)
      .then((resultado) => { if (ativo) { setDescobertos(resultado); setErroDescobrir(""); } })
      .catch((err) => ativo && setErroDescobrir(mensagemDeErro(err)));
    return () => { ativo = false; };
  }, [pagina, buscaAplicada, versao]);

  // Abre a prévia de um convite (do link ou digitado) para o usuário confirmar a entrada
  const abrirConvite = useCallback(async (valor) => {
    const limpo = (valor || "").trim().toUpperCase();
    if (!limpo) return;
    setOcupado(true);
    try {
      const grupo = await api.get(`/api/grupos/convite/${encodeURIComponent(limpo)}`);
      if (grupo.souMembro) {
        avisar("ok", `Você já faz parte de "${grupo.nome}".`);
        setGrupoAberto(grupo.id);
      } else {
        setPreviaConvite({ ...grupo, codigo: limpo });
      }
      setCodigo("");
    } catch (err) {
      avisar("erro", mensagemDeErro(err));
    } finally {
      setOcupado(false);
    }
  }, [avisar]);

  // Convite recebido pelo link ?convite=CODIGO
  useEffect(() => {
    if (!convite) return;
    abrirConvite(convite);
    onConviteUsado?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convite]);

  async function entrar(grupo, senha) {
    setOcupado(true);
    try {
      await api.post(`/api/grupos/${grupo.id}/entrar`, senha ? { senha } : {});
      setPedindoSenha(null);
      avisar("ok", `Você entrou em "${grupo.nome}".`);
      recarregar();
      setGrupoAberto(grupo.id);
      return null;
    } catch (err) {
      const mensagem = mensagemDeErro(err);
      if (!senha) avisar("erro", mensagem);
      return mensagem;
    } finally {
      setOcupado(false);
    }
  }

  async function aceitarConvite() {
    setOcupado(true);
    try {
      const grupo = await api.post(`/api/grupos/convite/${encodeURIComponent(previaConvite.codigo)}/entrar`, {});
      setPreviaConvite(null);
      avisar("ok", `Você entrou em "${grupo.nome}".`);
      recarregar();
      setGrupoAberto(grupo.id);
    } catch (err) {
      setPreviaConvite(null);
      avisar("erro", mensagemDeErro(err));
    } finally {
      setOcupado(false);
    }
  }

  const banner = aviso && (
    <div
      role="status"
      className={`flex items-center gap-2 px-4 py-3 rounded-sm border text-sm font-bold ${
        aviso.tipo === "ok" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"
      }`}
    >
      {aviso.tipo === "ok" ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
      <span className="flex-1">{aviso.texto}</span>
      <button onClick={() => setAviso(null)} aria-label="Fechar aviso" className="opacity-60 hover:opacity-100">✕</button>
    </div>
  );

  const modais = (
    <>
      {criando && (
        <GrupoFormModal
          onClose={() => setCriando(false)}
          onSalvo={(grupo) => {
            setCriando(false);
            avisar("ok", `Grupo "${grupo.nome}" criado. Compartilhe o convite com seus amigos!`);
            recarregar();
            setGrupoAberto(grupo.id);
          }}
        />
      )}
      {pedindoSenha && (
        <SenhaModal grupo={pedindoSenha} ocupado={ocupado} onClose={() => setPedindoSenha(null)}
          onConfirmar={(senha) => entrar(pedindoSenha, senha)} />
      )}
      {previaConvite && (
        <Modal title="Entrar no grupo?" onClose={() => setPreviaConvite(null)}>
          <div className="flex items-center gap-3">
            <IconeGrupo icone={previaConvite.icone} className="w-12 h-12" />
            <div className="min-w-0">
              <p className="font-extrabold text-slate-800 truncate">{previaConvite.nome}</p>
              <p className="text-xs text-slate-500 font-semibold">
                {previaConvite.totalMembros} {previaConvite.totalMembros === 1 ? "membro" : "membros"} · ranking por {METRICAS[previaConvite.metrica]?.label}
              </p>
            </div>
          </div>
          {previaConvite.descricao && <p className="text-sm text-slate-600">{previaConvite.descricao}</p>}
          <p className="text-xs text-slate-400 font-medium">
            Ao entrar, seu nome, nível e pontuação ficam visíveis para os membros do grupo.
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setPreviaConvite(null)}>Agora não</Button>
            <Button className="flex-1" disabled={ocupado} onClick={aceitarConvite}>
              {ocupado ? "Entrando..." : "Entrar no grupo"}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );

  if (grupoAberto) {
    return (
      <div className="space-y-4">
        {banner}
        <GrupoDetalhe
          key={`${grupoAberto}-${versao}`}
          grupoId={grupoAberto}
          user={user}
          avisar={avisar}
          onVerPerfil={onVerPerfil}
          onMudou={recarregar}
          onPedirSenha={setPedindoSenha}
          onEntrar={entrar}
          onVoltar={() => { setGrupoAberto(null); recarregar(); }}
        />
        {modais}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {banner}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-2 space-y-4">

          {/* Meus grupos */}
          <Card
            title="Meus grupos"
            actions={<IconButton icon={Plus} label="Criar grupo" onClick={() => setCriando(true)} />}
            data-finbot-context="Meus grupos: rankings particulares de que você participa. Cada grupo tem a própria classificação entre os membros."
          >
            {erroMeus ? (
              <EmptyState icon={Users} title="Não foi possível carregar seus grupos" text={erroMeus} />
            ) : !meus ? (
              <p className="py-8 text-center text-sm text-slate-400 font-medium animate-pulse">Carregando grupos...</p>
            ) : meus.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Você ainda não participa de nenhum grupo"
                text="Crie um grupo para competir com amigos ou entre em um com o código de convite."
                action={<Button icon={Plus} className="mt-2" onClick={() => setCriando(true)}>Criar grupo</Button>}
              />
            ) : (
              <div>
                {meus.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setGrupoAberto(g.id)}
                    className="w-full text-left flex items-center gap-3 py-3 px-1 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition"
                  >
                    <IconeGrupo icone={g.icone} />
                    <div className="flex-1 min-w-0">
                      <p className="font-extrabold text-slate-800 text-sm truncate">{g.nome}</p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-[11px] text-slate-500 font-semibold">
                        <SeloAcesso acesso={g.acesso} />
                        <span>{g.totalMembros} {g.totalMembros === 1 ? "membro" : "membros"}</span>
                        {g.meuPapel === "ADMIN" && <span style={{ color: "var(--color-primary)" }}>Administrador</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-black text-slate-800 leading-none">{g.minhaPosicao}º</p>
                      <p className="text-[10px] text-slate-400 font-bold mt-1">por {METRICAS[g.metrica]?.label}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>

          {/* Descobrir grupos */}
          <Card
            title="Descobrir grupos"
            subtitle="Grupos abertos e protegidos por senha"
            data-finbot-context="Descobrir grupos: lista os grupos abertos (qualquer um entra) e os protegidos por senha. Grupos só por convite não aparecem aqui."
          >
            <div className="relative mb-3">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="search"
                aria-label="Buscar grupo pelo nome"
                placeholder="Buscar grupo pelo nome..."
                value={busca}
                maxLength={60}
                onChange={(e) => setBusca(e.target.value)}
                className={`${inputClass} pl-10`}
              />
            </div>

            {erroDescobrir ? (
              <EmptyState icon={Search} title="Não foi possível buscar grupos" text={erroDescobrir} />
            ) : !descobertos ? (
              <p className="py-8 text-center text-sm text-slate-400 font-medium animate-pulse">Buscando grupos...</p>
            ) : descobertos.itens.length === 0 ? (
              <EmptyState
                icon={Search}
                title={buscaAplicada ? "Nenhum grupo encontrado" : "Ainda não há grupos públicos"}
                text={buscaAplicada ? `Nenhum grupo com "${buscaAplicada}" no nome.` : "Seja a primeira pessoa a criar um!"}
              />
            ) : (
              <div>
                {descobertos.itens.map((g) => (
                  <div key={g.id} className="flex items-center gap-3 py-3 px-1 border-b border-slate-100 last:border-0">
                    <IconeGrupo icone={g.icone} />
                    <div className="flex-1 min-w-0">
                      <p className="font-extrabold text-slate-800 text-sm truncate">{g.nome}</p>
                      {g.descricao && <p className="text-xs text-slate-500 truncate">{g.descricao}</p>}
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-[11px] text-slate-500 font-semibold">
                        <SeloAcesso acesso={g.acesso} />
                        <span>{g.totalMembros} {g.totalMembros === 1 ? "membro" : "membros"}</span>
                        <span>por {METRICAS[g.metrica]?.label}</span>
                      </div>
                    </div>
                    {g.souMembro ? (
                      <Button variant="secondary" onClick={() => setGrupoAberto(g.id)}>Abrir</Button>
                    ) : g.acesso === "SENHA" ? (
                      <Button variant="outline" icon={Lock} onClick={() => setPedindoSenha(g)}>Entrar</Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button variant="ghost" onClick={() => setGrupoAberto(g.id)}>Ver</Button>
                        <Button disabled={ocupado} onClick={() => entrar(g)}>Entrar</Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {descobertos && descobertos.totalPaginas > 1 && (
              <div className="flex items-center justify-between pt-3">
                <p className="text-xs text-slate-400 font-semibold">
                  Página {descobertos.pagina + 1} de {descobertos.totalPaginas} · {descobertos.total} grupos
                </p>
                <div className="flex gap-2">
                  <IconButton icon={ChevronLeft} label="Página anterior" disabled={pagina === 0}
                    className="disabled:opacity-40" onClick={() => setPagina((n) => Math.max(n - 1, 0))} />
                  <IconButton icon={ChevronRight} label="Próxima página" disabled={pagina + 1 >= descobertos.totalPaginas}
                    className="disabled:opacity-40" onClick={() => setPagina((n) => n + 1)} />
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Ações: criar e entrar com código */}
        <div className="space-y-4">
          <Card title="Competir com conhecidos">
            <div className="rounded-sm p-5 text-white space-y-3" style={{ background: "var(--color-primary-dark)" }}>
              <Trophy className="w-7 h-7" style={{ color: "var(--color-accent)" }} />
              <p className="text-sm font-bold">Crie um ranking só seu</p>
              <p className="text-xs text-white/70 font-medium">
                Escolha o nome, quem pode entrar e se a disputa é por XP ou por saldo. Depois é só mandar o convite.
              </p>
              <button
                onClick={() => setCriando(true)}
                className="w-full inline-flex items-center justify-center gap-1.5 font-bold py-2.5 px-3.5 rounded-sm text-xs transition hover:opacity-90"
                style={{ background: "var(--color-accent)", color: "var(--color-text-on-primary)" }}
              >
                <Plus className="w-3.5 h-3.5" /> Criar grupo
              </button>
            </div>
          </Card>

          <Card title="Tenho um convite" icon={KeyRound}>
            <form onSubmit={(e) => { e.preventDefault(); abrirConvite(codigo); }} className="space-y-3">
              <div>
                <label className={labelClass} htmlFor="codigo-convite">Código de convite</label>
                <input
                  id="codigo-convite"
                  className={`${inputClass} uppercase tracking-widest`}
                  placeholder="EX: ABCD2345"
                  maxLength={12}
                  autoComplete="off"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={ocupado || !codigo.trim()}>
                {ocupado ? "Verificando..." : "Ver grupo"}
              </Button>
            </form>
          </Card>
        </div>
      </div>

      {modais}
    </div>
  );
}

// ─── DETALHE DO GRUPO ────────────────────────────────────────────────────────
function GrupoDetalhe({ grupoId, user, avisar, onVerPerfil, onMudou, onPedirSenha, onEntrar, onVoltar }) {
  const [grupo, setGrupo] = useState(null);
  const [membros, setMembros] = useState(null);
  const [erro, setErro] = useState("");
  const [versao, setVersao] = useState(0);
  const [editando, setEditando] = useState(false);
  const [confirmar, setConfirmar] = useState(null);   // { titulo, texto, rotulo, acao }
  const [ocupado, setOcupado] = useState(false);

  const recarregar = () => setVersao((v) => v + 1);

  useEffect(() => {
    let ativo = true;
    api.get(`/api/grupos/${grupoId}`)
      .then(async (g) => {
        if (!ativo) return;
        setGrupo(g);
        // A lista de membros só é liberada para quem participa
        const lista = g.souMembro ? await api.get(`/api/grupos/${grupoId}/membros`) : null;
        if (ativo) setMembros(lista);
      })
      .catch((err) => ativo && setErro(mensagemDeErro(err)));
    return () => { ativo = false; };
  }, [grupoId, versao]);

  const carregarRanking = useCallback(({ pagina, busca }) => {
    const params = new URLSearchParams({ pagina, tamanho: 10 });
    if (busca) params.set("busca", busca);
    return api.get(`/api/grupos/${grupoId}/ranking?${params}`);
  }, [grupoId]);

  // Executa uma ação de administração e mostra o resultado
  async function executar(acao, mensagemOk, aoTerminar) {
    setOcupado(true);
    try {
      await acao();
      setConfirmar(null);
      avisar("ok", mensagemOk);
      onMudou();
      if (aoTerminar) aoTerminar(); else recarregar();
    } catch (err) {
      setConfirmar(null);
      avisar("erro", mensagemDeErro(err));
      recarregar();
    } finally {
      setOcupado(false);
    }
  }

  if (erro) {
    return (
      <Card>
        <EmptyState icon={Users} title="Grupo indisponível" text={erro}
          action={<Button variant="secondary" icon={ArrowLeft} className="mt-2" onClick={onVoltar}>Voltar aos grupos</Button>} />
      </Card>
    );
  }
  if (!grupo) {
    return <p className="py-10 text-center text-sm text-slate-400 font-medium animate-pulse">Carregando grupo...</p>;
  }

  const souAdmin = grupo.meuPapel === "ADMIN";
  const podeVerRanking = grupo.souMembro || grupo.acesso === "ABERTO";

  const copiarConvite = async (texto, oQue) => {
    const ok = await copiar(texto);
    avisar(ok ? "ok" : "erro", ok ? `${oQue} copiado!` : "Não foi possível copiar. Selecione e copie manualmente.");
  };

  return (
    <div className="space-y-4">
      {/* Cabeçalho do grupo */}
      <Card>
        <div className="flex flex-wrap items-start gap-4">
          <IconButton icon={ArrowLeft} label="Voltar aos grupos" onClick={onVoltar} />
          <IconeGrupo icone={grupo.icone} className="w-14 h-14" />
          <div className="flex-1 min-w-[12rem]">
            <h2 className="text-xl font-black text-slate-800 break-words">{grupo.nome}</h2>
            {grupo.descricao && <p className="text-sm text-slate-500 mt-0.5 break-words">{grupo.descricao}</p>}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2 text-[11px] text-slate-500 font-semibold">
              <SeloAcesso acesso={grupo.acesso} />
              <span>{grupo.totalMembros} {grupo.totalMembros === 1 ? "membro" : "membros"}</span>
              <span>ranking por {METRICAS[grupo.metrica]?.descricao.toLowerCase()}</span>
              {souAdmin && <span style={{ color: "var(--color-primary)" }}>Você administra este grupo</span>}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {!grupo.souMembro && (
              grupo.acesso === "SENHA"
                ? <Button icon={Lock} onClick={() => onPedirSenha(grupo)}>Entrar com senha</Button>
                : <Button onClick={async () => { await onEntrar(grupo); recarregar(); }}>Entrar no grupo</Button>
            )}
            {souAdmin && <Button variant="secondary" icon={Pencil} onClick={() => setEditando(true)}>Editar</Button>}
            {grupo.souMembro && (
              <Button variant="secondary" icon={LogOut} onClick={() => setConfirmar({
                titulo: "Sair do grupo?",
                texto: grupo.totalMembros === 1
                  ? "Você é a única pessoa no grupo. Ao sair, o grupo será apagado."
                  : souAdmin
                    ? "Se você for o único administrador, o membro mais antigo assume a administração."
                    : "Você deixa de aparecer na classificação deste grupo.",
                rotulo: "Sair",
                acao: () => executar(() => api.post(`/api/grupos/${grupo.id}/sair`, {}), `Você saiu de "${grupo.nome}".`, onVoltar),
              })}>Sair do grupo</Button>
            )}
            {souAdmin && (
              <Button variant="danger" icon={Trash2} onClick={() => setConfirmar({
                titulo: "Excluir o grupo?",
                texto: "O grupo e sua classificação serão apagados para todos os membros. Esta ação não pode ser desfeita.",
                rotulo: "Excluir grupo",
                acao: () => executar(() => api.delete(`/api/grupos/${grupo.id}`), `Grupo "${grupo.nome}" excluído.`, onVoltar),
              })}>Excluir</Button>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* Classificação do grupo */}
        <Card className="lg:col-span-2" title="Classificação do grupo"
          subtitle={`Por ${METRICAS[grupo.metrica]?.descricao.toLowerCase()} · empates: conta mais antiga na frente`}>
          {podeVerRanking ? (
            <RankingTabela
              key={`${grupo.id}-${grupo.metrica}-${versao}`}
              carregar={carregarRanking}
              metrica={grupo.metrica}
              user={user}
              onVerPerfil={onVerPerfil}
            />
          ) : (
            <EmptyState icon={Lock} title="Classificação reservada aos membros"
              text="Entre no grupo com a senha para ver quem está na frente."
              action={<Button icon={Lock} className="mt-2" onClick={() => onPedirSenha(grupo)}>Entrar com senha</Button>} />
          )}
        </Card>

        <div className="space-y-4">
          {/* Posição no grupo */}
          {grupo.souMembro && (
            <Card title="Sua posição no grupo">
              <div className="rounded-sm p-5 text-white" style={{ background: "var(--color-primary-dark)" }}>
                <p className="text-4xl font-black leading-none" style={{ color: "var(--color-accent)" }}>{grupo.minhaPosicao}º</p>
                <p className="text-sm font-bold mt-2">
                  entre {grupo.totalMembros} {grupo.totalMembros === 1 ? "membro" : "membros"}
                </p>
              </div>
            </Card>
          )}

          {/* Convite */}
          {grupo.souMembro && (
            <Card title="Convidar pessoas" icon={Mail}>
              <div className="space-y-3">
                <div className="bg-slate-50 border border-dashed border-slate-200 rounded-sm py-3 text-center">
                  <p className={labelClass}>Código de convite</p>
                  <p className="text-2xl font-black tracking-[0.3em] text-slate-800 select-all">{grupo.codigoConvite}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="secondary" icon={Copy} onClick={() => copiarConvite(grupo.codigoConvite, "Código")}>Copiar código</Button>
                  <Button variant="secondary" icon={Link2} onClick={() => copiarConvite(linkDoConvite(grupo.codigoConvite), "Link")}>Copiar link</Button>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">
                  Quem tiver o código entra direto{grupo.acesso === "SENHA" ? ", sem precisar da senha" : ""}.
                </p>
                {souAdmin && (
                  <Button variant="ghost" icon={RefreshCw} className="w-full" onClick={() => setConfirmar({
                    titulo: "Gerar um novo convite?",
                    texto: "O código atual deixa de funcionar. Quem já entrou continua no grupo.",
                    rotulo: "Gerar novo código",
                    acao: () => executar(() => api.post(`/api/grupos/${grupo.id}/convite`, {}), "Novo código de convite gerado."),
                  })}>Gerar novo código</Button>
                )}
              </div>
            </Card>
          )}

          {/* Membros */}
          {grupo.souMembro && (
            <Card title="Membros" subtitle={souAdmin ? "Promova, rebaixe ou remova participantes" : undefined}>
              {!membros ? (
                <p className="py-4 text-center text-sm text-slate-400 font-medium animate-pulse">Carregando membros...</p>
              ) : (
                <div>
                  {membros.map((m) => {
                    const souEu = m.perfilId === user.id;
                    const admin = m.papel === "ADMIN";
                    return (
                      <div key={m.perfilId} className="flex items-center gap-2.5 py-2.5 border-b border-slate-100 last:border-0">
                        <Avatar nome={m.nome} avatarUrl={m.avatarUrl} className="w-8 h-8 text-xs" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate">{m.nome}{souEu && " (você)"}</p>
                          <p className="text-[10px] font-bold" style={admin ? { color: "var(--color-primary)" } : { color: "#94a3b8" }}>
                            {admin ? "Administrador" : "Membro"}
                          </p>
                        </div>
                        {souAdmin && !souEu && (
                          <div className="flex gap-1.5">
                            <IconButton
                              icon={admin ? ShieldOff : ShieldCheck}
                              label={admin ? `Tirar a administração de ${m.nome}` : `Tornar ${m.nome} administrador`}
                              disabled={ocupado}
                              onClick={() => executar(
                                () => api.put(`/api/grupos/${grupo.id}/membros/${m.perfilId}/papel`, { papel: admin ? "MEMBRO" : "ADMIN" }),
                                admin ? `${m.nome} voltou a ser membro.` : `${m.nome} agora é administrador.`)}
                            />
                            <IconButton
                              icon={UserMinus}
                              label={`Remover ${m.nome} do grupo`}
                              disabled={ocupado}
                              onClick={() => setConfirmar({
                                titulo: `Remover ${m.nome}?`,
                                texto: "A pessoa sai da classificação do grupo. Ela pode voltar se tiver o convite ou a senha.",
                                rotulo: "Remover do grupo",
                                acao: () => executar(() => api.delete(`/api/grupos/${grupo.id}/membros/${m.perfilId}`), `${m.nome} foi removido do grupo.`),
                              })}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          )}
        </div>
      </div>

      {editando && (
        <GrupoFormModal
          grupo={grupo}
          onClose={() => setEditando(false)}
          onSalvo={() => { setEditando(false); avisar("ok", "Grupo atualizado."); onMudou(); recarregar(); }}
        />
      )}

      {confirmar && (
        <Modal title={confirmar.titulo} onClose={() => setConfirmar(null)}>
          <p className="text-sm text-slate-600">{confirmar.texto}</p>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setConfirmar(null)}>Cancelar</Button>
            <Button variant="danger" className="flex-1" disabled={ocupado} onClick={confirmar.acao}>
              {ocupado ? "Aguarde..." : confirmar.rotulo}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── MODAL: CRIAR / EDITAR GRUPO ─────────────────────────────────────────────
function GrupoFormModal({ grupo, onClose, onSalvo }) {
  const editando = Boolean(grupo);
  const [nome, setNome] = useState(grupo?.nome || "");
  const [descricao, setDescricao] = useState(grupo?.descricao || "");
  const [icone, setIcone] = useState(grupo?.icone || "trophy");
  const [acesso, setAcesso] = useState(grupo?.acesso || "ABERTO");
  const [metrica, setMetrica] = useState(grupo?.metrica || "XP");
  const [senha, setSenha] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  // Ao editar um grupo que já tem senha, o campo em branco mantém a senha atual
  const senhaOpcional = editando && grupo.acesso === "SENHA";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (nome.trim().length < 3) return setErro("O nome do grupo deve ter pelo menos 3 caracteres.");
    if (acesso === "SENHA" && !senhaOpcional && senha.length < 4) return setErro("A senha do grupo deve ter pelo menos 4 caracteres.");
    if (acesso === "SENHA" && senha && senha.length < 4) return setErro("A senha do grupo deve ter pelo menos 4 caracteres.");

    setSalvando(true);
    setErro("");
    const dados = { nome: nome.trim(), descricao: descricao.trim(), icone, acesso, metrica, senha: acesso === "SENHA" ? senha : "" };
    try {
      const salvo = editando ? await api.put(`/api/grupos/${grupo.id}`, dados) : await api.post("/api/grupos", dados);
      onSalvo(salvo);
    } catch (err) {
      setErro(mensagemDeErro(err));
      setSalvando(false);
    }
  };

  return (
    <Modal title={editando ? "Editar grupo" : "Criar grupo"} onClose={onClose} size="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClass} htmlFor="grupo-nome">Nome do grupo</label>
          <input id="grupo-nome" className={inputClass} required minLength={3} maxLength={60} autoFocus
            placeholder="Ex: Amigos da faculdade" value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>

        <div>
          <label className={labelClass} htmlFor="grupo-descricao">Descrição (opcional)</label>
          <textarea id="grupo-descricao" className={`${inputClass} resize-none`} rows={2} maxLength={280}
            placeholder="Sobre o que é a disputa?" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        </div>

        <div>
          <p className={labelClass}>Ícone</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(ICONES_GRUPO).map(([id, Icon]) => (
              <button
                key={id}
                type="button"
                aria-label={`Ícone ${id}`}
                aria-pressed={icone === id}
                onClick={() => setIcone(id)}
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition ${
                  icone === id ? "" : "border-slate-100 text-slate-400 hover:border-slate-300"
                }`}
                style={icone === id ? { borderColor: "var(--color-primary)", color: "var(--color-primary)" } : undefined}
              >
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className={labelClass}>Quem pode entrar</p>
          <div className="space-y-2">
            {Object.entries(ACESSOS).map(([id, a]) => {
              const Icon = a.icon;
              const ativo = acesso === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={ativo}
                  onClick={() => setAcesso(id)}
                  className={`w-full text-left p-3 rounded-sm border-2 flex items-start gap-3 transition ${
                    ativo ? "" : "border-slate-100 hover:border-slate-300"
                  }`}
                  style={ativo ? { borderColor: "var(--color-primary)" } : undefined}
                >
                  <Icon className="w-4 h-4 mt-0.5 shrink-0" style={ativo ? { color: "var(--color-primary)" } : { color: "#94a3b8" }} />
                  <span>
                    <span className="block text-xs font-extrabold text-slate-800">{a.label}</span>
                    <span className="block text-[11px] text-slate-500 mt-0.5">{a.descricao}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {acesso === "SENHA" && (
          <div>
            <label className={labelClass} htmlFor="grupo-senha">
              Senha do grupo{senhaOpcional && " (deixe em branco para manter a atual)"}
            </label>
            <input id="grupo-senha" type="password" className={inputClass} maxLength={72} autoComplete="new-password"
              placeholder="Mínimo de 4 caracteres" value={senha} onChange={(e) => { setSenha(e.target.value); setErro(""); }} />
          </div>
        )}

        <div>
          <p className={labelClass}>Regra de pontuação</p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(METRICAS).map(([id, m]) => {
              const Icon = m.icon;
              const ativo = metrica === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={ativo}
                  onClick={() => setMetrica(id)}
                  className={`p-3 rounded-sm border-2 flex items-center gap-2 text-xs font-extrabold text-slate-800 transition ${
                    ativo ? "" : "border-slate-100 hover:border-slate-300"
                  }`}
                  style={ativo ? { borderColor: "var(--color-primary)" } : undefined}
                >
                  <Icon className="w-4 h-4 shrink-0" style={ativo ? { color: "var(--color-primary)" } : { color: "#94a3b8" }} />
                  {m.descricao}
                </button>
              );
            })}
          </div>
        </div>

        {erro && <p className="text-xs font-bold text-red-600">{erro}</p>}

        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button type="submit" className="flex-1" disabled={salvando}>
            {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Criar grupo"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── MODAL: SENHA DO GRUPO ───────────────────────────────────────────────────
function SenhaModal({ grupo, ocupado, onClose, onConfirmar }) {
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro("");
    const mensagem = await onConfirmar(senha);
    if (mensagem) setErro(mensagem);
  };

  return (
    <Modal title={`Entrar em "${grupo.nome}"`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-slate-600">Este grupo é protegido por senha. Peça a senha para quem administra o grupo.</p>
        <div>
          <label className={labelClass} htmlFor="senha-grupo">Senha do grupo</label>
          <input id="senha-grupo" type="password" className={inputClass} required maxLength={72} autoFocus
            autoComplete="off" value={senha} onChange={(e) => setSenha(e.target.value)} />
        </div>
        {erro && <p className="text-xs font-bold text-red-600" role="alert">{erro}</p>}
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button type="submit" className="flex-1" disabled={ocupado || !senha}>
            {ocupado ? "Entrando..." : "Entrar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
