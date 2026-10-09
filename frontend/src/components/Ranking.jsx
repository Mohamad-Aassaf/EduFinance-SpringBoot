/**
 * Ranking.jsx — Classificações públicas e grupos
 *
 * Abas:
 * - Global, País, Estado e Cidade: rankings públicos. Os regionais comparam
 *   com a localização que o usuário informou no perfil.
 * - Grupos: competições entre conhecidos (ver RankingGrupos.jsx).
 *
 * Toda a classificação é calculada no backend a partir dos dados salvos;
 * esta tela só exibe as páginas que recebe.
 *
 * Props:
 * - user, onUpdateUser: usuário logado e atualização (ao salvar a localização)
 * - convite / onConviteUsado: código de convite recebido pelo link ?convite=CODIGO
 */

import { useState, useCallback } from "react";
import { Globe, Flag, Map as MapIcon, Building2, Users, MapPin, Pencil } from "lucide-react";
import { api } from "../api";
import { Card, Button, EmptyState, IconButton } from "./ui";
import {
  METRICAS, RankingTabela, LocalizacaoForm, PerfilPublicoModal, nomePais,
} from "./rankingShared";
import RankingGrupos from "./RankingGrupos";

const ABAS = [
  { id: "global", label: "Global", icon: Globe },
  { id: "pais", label: "País", icon: Flag },
  { id: "estado", label: "Estado", icon: MapIcon },
  { id: "cidade", label: "Cidade", icon: Building2 },
  { id: "grupos", label: "Grupos", icon: Users },
];

const NOMES_CAMPO = { pais: "país", estado: "estado", cidade: "cidade" };

// Título do ranking conforme o escopo e a localização usada no filtro
function tituloDoEscopo(aba, local) {
  if (aba === "pais" && local?.pais) return `Ranking de ${nomePais(local.pais)}`;
  if (aba === "estado" && local?.estado) return `Ranking de ${local.estado}`;
  if (aba === "cidade" && local?.cidade) return `Ranking de ${local.cidade}`;
  return aba === "global" ? "Ranking global" : "Ranking regional";
}

export default function Ranking({ user, onUpdateUser, convite, onConviteUsado }) {
  // Quem chega por um link de convite cai direto na aba de grupos
  const [aba, setAba] = useState(convite ? "grupos" : "global");
  const [metrica, setMetrica] = useState("XP");
  const [meta, setMeta] = useState(null);         // escopo, local e campos faltando da última resposta
  const [resumo, setResumo] = useState(null);     // posição do usuário e total de participantes
  const [editandoLocal, setEditandoLocal] = useState(false);
  const [versao, setVersao] = useState(0);        // muda para forçar nova consulta
  const [perfilAberto, setPerfilAberto] = useState(null);

  const carregar = useCallback(async ({ pagina, busca }) => {
    const params = new URLSearchParams({ escopo: aba, metrica, pagina, tamanho: 10 });
    if (busca) params.set("busca", busca);
    const resposta = await api.get(`/api/rankings?${params}`);
    setMeta(resposta);
    // Sem localização suficiente o backend não devolve ranking
    return resposta.ranking || { itens: [], total: 0, totalPaginas: 0, totalParticipantes: 0, minhaPosicao: null, semLocal: true };
    // versao entra nas dependências para recarregar depois de salvar a localização
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aba, metrica, versao]);

  const trocarAba = (id) => {
    setAba(id);
    setMeta(null);
    setResumo(null);
    setEditandoLocal(false);
  };

  const aoSalvarLocal = () => {
    setEditandoLocal(false);
    setVersao((v) => v + 1);
  };

  const faltando = meta?.camposFaltando || [];
  const temLocal = Boolean(user.pais);

  return (
    <div className="px-4 md:px-8 pt-2 pb-8 space-y-4 animate-[fadeIn_0.3s_ease-out]">

      {/* Abas de escopo + métrica */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-full overflow-x-auto max-w-full" role="tablist">
          {ABAS.map((a) => {
            const Icon = a.icon;
            const ativa = aba === a.id;
            return (
              <button
                key={a.id}
                role="tab"
                aria-selected={ativa}
                onClick={() => trocarAba(a.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition ${
                  ativa ? "shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
                style={ativa ? { background: "var(--color-primary)", color: "var(--color-text-on-primary)" } : undefined}
              >
                <Icon className="w-3.5 h-3.5" />
                {a.label}
              </button>
            );
          })}
        </div>

        {aba !== "grupos" && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">Classificar por</span>
            <div className="flex gap-1 bg-slate-100 p-1 rounded-full">
              {Object.entries(METRICAS).map(([id, m]) => (
                <button
                  key={id}
                  onClick={() => setMetrica(id)}
                  title={m.descricao}
                  aria-pressed={metrica === id}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${
                    metrica === id ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {aba === "grupos" ? (
        <RankingGrupos
          user={user}
          convite={convite}
          onConviteUsado={onConviteUsado}
          onVerPerfil={setPerfilAberto}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">

          {/* Classificação */}
          <Card
            className="lg:col-span-2"
            title={tituloDoEscopo(aba, meta?.local)}
            subtitle={`Por ${METRICAS[metrica].descricao.toLowerCase()} · empates: conta mais antiga na frente`}
            data-finbot-context="Classificação dos usuários da plataforma. Você pode ver o ranking global ou só do seu país, estado ou cidade, ordenado por XP ou por saldo virtual."
          >
            <RankingTabela
              key={`${aba}-${metrica}-${versao}`}
              carregar={carregar}
              metrica={metrica}
              user={user}
              onVerPerfil={setPerfilAberto}
              onDados={setResumo}
              mostrarSemDados={(pagina) => pagina.semLocal}
              semDados={
                <div className="space-y-4">
                  <EmptyState
                    icon={MapPin}
                    title="Informe sua localização"
                    text={`Para ver este ranking, falta informar: ${faltando.map((c) => NOMES_CAMPO[c]).join(", ")}.`}
                  />
                  <LocalizacaoForm user={user} onUpdateUser={onUpdateUser} onSalvo={aoSalvarLocal} />
                </div>
              }
            />
          </Card>

          <div className="space-y-4">
            {/* Posição do usuário */}
            <Card title="Sua posição">
              <div className="rounded-sm p-5 text-white" style={{ background: "var(--color-primary-dark)" }}>
                <p className="text-4xl font-black leading-none" style={{ color: "var(--color-accent)" }}>
                  {resumo?.minhaPosicao ? `${resumo.minhaPosicao}º` : "—"}
                </p>
                <p className="text-sm font-bold mt-2">
                  {resumo?.minhaPosicao
                    ? `entre ${resumo.totalParticipantes} ${resumo.totalParticipantes === 1 ? "participante" : "participantes"}`
                    : "Sem classificação neste ranking"}
                </p>
                <p className="text-xs text-white/60 font-medium mt-1">
                  {user.xp.toLocaleString("pt-BR")} XP · R$ {user.saldoVirtual.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                </p>
              </div>
            </Card>

            {/* Localização usada nos rankings regionais.
                Some quando o formulário já está aberto no lugar da classificação. */}
            {!resumo?.semLocal && (
              <Card
                title="Sua localização"
                actions={temLocal && !editandoLocal && (
                  <IconButton icon={Pencil} label="Editar localização" onClick={() => setEditandoLocal(true)} />
                )}
              >
                {editandoLocal ? (
                  <LocalizacaoForm
                    user={user}
                    onUpdateUser={onUpdateUser}
                    onSalvo={aoSalvarLocal}
                    onCancelar={() => setEditandoLocal(false)}
                  />
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <MapPin className="w-4 h-4 shrink-0" style={{ color: "var(--color-primary)" }} />
                      {temLocal
                        ? [user.cidade, user.estado, nomePais(user.pais)].filter(Boolean).join(", ")
                        : "Não informada"}
                    </p>
                    <p className="text-xs text-slate-400 font-medium">
                      Define em quais rankings de país, estado e cidade você aparece.
                    </p>
                    {(!user.estado || !user.cidade) && (
                      <Button variant="outline" icon={MapPin} onClick={() => setEditandoLocal(true)}>
                        {temLocal ? "Completar localização" : "Informar localização"}
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      )}

      {perfilAberto && <PerfilPublicoModal perfilId={perfilAberto} onClose={() => setPerfilAberto(null)} />}
    </div>
  );
}
