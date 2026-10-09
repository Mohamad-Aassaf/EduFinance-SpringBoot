/**
 * rankingShared.jsx — Peças usadas pelos rankings públicos e pelos grupos
 *
 * - RankingTabela:      classificação paginada com busca por nome
 * - LocalizacaoForm:    país, estado e cidade do usuário (rankings regionais)
 * - PerfilPublicoModal: resumo de um participante
 * - utilitários de formatação (métricas, localização, erros)
 */

import { useState, useEffect } from "react";
import {
  Trophy, Medal, Search, ChevronLeft, ChevronRight, MapPin, Award, Zap, Wallet,
  Rocket, Star, Flame, Crown, Target, PiggyBank, LineChart, Users,
} from "lucide-react";
import { api } from "../api";
import { Avatar, Button, EmptyState, IconButton, Modal, inputClass, labelClass } from "./ui";

// ─── MÉTRICAS ────────────────────────────────────────────────────────────────
export const METRICAS = {
  XP: { label: "XP", descricao: "Pontos de experiência", icon: Zap },
  SALDO: { label: "Saldo", descricao: "Saldo virtual", icon: Wallet },
};

export function formatarMetrica(metrica, entrada) {
  if (metrica === "SALDO") {
    return `R$ ${entrada.saldoVirtual.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
  }
  return `${entrada.xp.toLocaleString("pt-BR")} XP`;
}

// ─── ÍCONES DOS GRUPOS (as chaves são validadas no backend) ──────────────────
export const ICONES_GRUPO = {
  trophy: Trophy, rocket: Rocket, star: Star, flame: Flame,
  crown: Crown, target: Target, piggy: PiggyBank, chart: LineChart,
};

export function IconeGrupo({ icone, className = "w-11 h-11" }) {
  const Icon = ICONES_GRUPO[icone] || Users;
  return (
    <div
      className={`rounded-full flex items-center justify-center shrink-0 ${className}`}
      style={{ background: "color-mix(in srgb, var(--color-primary) 12%, transparent)", color: "var(--color-primary)" }}
    >
      <Icon className="w-1/2 h-1/2" />
    </div>
  );
}

// ─── LOCALIZAÇÃO ─────────────────────────────────────────────────────────────
const CODIGOS_PAIS = [
  "BR", "PT", "AO", "MZ", "CV", "GW", "ST", "TL", "AR", "BO", "CL", "CO", "EC", "PY", "PE", "UY", "VE",
  "MX", "US", "CA", "ES", "FR", "DE", "IT", "GB", "IE", "NL", "BE", "CH", "SE", "NO", "DK", "PL",
  "JP", "CN", "KR", "IN", "AU", "NZ", "ZA", "NG", "EG", "MA", "LB", "SY", "TR", "AE", "SA", "IL",
];

const nomesDePais = new Intl.DisplayNames(["pt-BR"], { type: "region" });

export function nomePais(codigo) {
  if (!codigo) return "";
  try {
    return nomesDePais.of(codigo) || codigo;
  } catch {
    return codigo;
  }
}

// Brasil primeiro, depois os demais em ordem alfabética
const PAISES = CODIGOS_PAIS.map((codigo) => ({ codigo, nome: nomePais(codigo) })).sort((a, b) =>
  a.codigo === "BR" ? -1 : b.codigo === "BR" ? 1 : a.nome.localeCompare(b.nome, "pt-BR")
);

const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

// Texto curto com a localização de um perfil: "Campinas, SP" ou só o país
export function formatarLocal({ pais, estado, cidade }) {
  if (cidade && estado) return `${cidade}, ${estado}`;
  if (estado) return `${estado}, ${nomePais(pais)}`;
  return nomePais(pais);
}

// "são josé dos campos" → "São José dos Campos" (usado quando não há sugestão oficial)
const MINUSCULAS = new Set(["de", "da", "do", "das", "dos", "e"]);
function capitalizar(texto) {
  return texto
    .trim()
    .split(/\s+/)
    .map((palavra, i) => {
      const minuscula = palavra.toLowerCase();
      if (i > 0 && MINUSCULAS.has(minuscula)) return minuscula;
      return minuscula.charAt(0).toUpperCase() + minuscula.slice(1);
    })
    .join(" ");
}

// As mensagens de regra vêm do backend como texto; o resto vira um aviso genérico
export function mensagemDeErro(err) {
  const texto = err?.message || "";
  if (!texto || texto.startsWith("{") || texto.startsWith("<") || texto.startsWith("Erro:")) {
    return "Algo deu errado. Tente novamente em instantes.";
  }
  if (texto === "Failed to fetch") return "Não foi possível falar com o servidor.";
  return texto;
}

/*
 * Formulário de localização.
 * A localização é sempre informada pelo usuário: nada é deduzido por IP ou GPS.
 * Para o Brasil, o estado é uma lista de UFs e a cidade recebe sugestões do IBGE,
 * o que evita grafias diferentes para a mesma cidade.
 */
export function LocalizacaoForm({ user, onUpdateUser, onSalvo, onCancelar }) {
  const [pais, setPais] = useState(user.pais || "BR");
  const [estado, setEstado] = useState(user.estado || "");
  const [cidade, setCidade] = useState(user.cidade || "");
  const [cidadesSugeridas, setCidadesSugeridas] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const brasil = pais === "BR";

  // Sugestões de cidade (IBGE). Se a consulta falhar, o campo continua livre.
  useEffect(() => {
    if (!brasil || !UFS.includes(estado)) {
      setCidadesSugeridas([]);
      return;
    }
    let ativo = true;
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${estado}/municipios?orderBy=nome`)
      .then((r) => (r.ok ? r.json() : []))
      .then((lista) => ativo && setCidadesSugeridas(lista.map((m) => m.nome)))
      .catch(() => ativo && setCidadesSugeridas([]));
    return () => { ativo = false; };
  }, [brasil, estado]);

  async function salvar(dados) {
    setSalvando(true);
    setErro("");
    try {
      const atualizado = await api.put("/api/perfis/me/localizacao", dados);
      onUpdateUser(atualizado);
      onSalvo?.(atualizado);
    } catch (err) {
      setErro(mensagemDeErro(err));
    } finally {
      setSalvando(false);
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    // Usa a grafia oficial quando a cidade digitada bate com uma sugestão
    const oficial = cidadesSugeridas.find((c) => c.toLowerCase() === cidade.trim().toLowerCase());
    salvar({ pais, estado: estado.trim(), cidade: oficial || capitalizar(cidade) });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 text-left">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className={labelClass} htmlFor="loc-pais">País</label>
          <select
            id="loc-pais"
            className={inputClass}
            value={pais}
            onChange={(e) => { setPais(e.target.value); setEstado(""); setCidade(""); }}
          >
            {PAISES.map((p) => <option key={p.codigo} value={p.codigo}>{p.nome}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="loc-estado">Estado</label>
          {brasil ? (
            <select
              id="loc-estado"
              className={inputClass}
              value={estado}
              onChange={(e) => { setEstado(e.target.value); setCidade(""); }}
            >
              <option value="">Selecione</option>
              {UFS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
            </select>
          ) : (
            <input
              id="loc-estado"
              className={inputClass}
              maxLength={60}
              placeholder="Estado ou região"
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
            />
          )}
        </div>
        <div>
          <label className={labelClass} htmlFor="loc-cidade">Cidade</label>
          <input
            id="loc-cidade"
            className={inputClass}
            maxLength={80}
            list="loc-cidades"
            placeholder={estado ? "Sua cidade" : "Escolha o estado antes"}
            disabled={!estado.trim()}
            value={cidade}
            onChange={(e) => setCidade(e.target.value)}
          />
          <datalist id="loc-cidades">
            {cidadesSugeridas.map((c) => <option key={c} value={c} />)}
          </datalist>
        </div>
      </div>

      {erro && <p className="text-xs font-bold text-red-600">{erro}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" icon={MapPin} disabled={salvando}>
          {salvando ? "Salvando..." : "Salvar localização"}
        </Button>
        {onCancelar && <Button variant="secondary" onClick={onCancelar}>Cancelar</Button>}
        {(user.pais || user.estado || user.cidade) && (
          <Button variant="ghost" disabled={salvando} onClick={() => salvar({ pais: "", estado: "", cidade: "" })}>
            Remover localização
          </Button>
        )}
      </div>
      <p className="text-[11px] text-slate-400 font-medium">
        Sua cidade e seu estado aparecem para outros usuários nos rankings.
      </p>
    </form>
  );
}

// ─── TABELA DE CLASSIFICAÇÃO ─────────────────────────────────────────────────
/*
 * Props:
 * - carregar({ pagina, busca }): função estável (useCallback) que devolve uma página do ranking
 * - metrica: "XP" ou "SALDO" — define o valor em destaque à direita
 * - onDados(pagina): avisa o pai a cada carga (posição do usuário, total de participantes)
 * - semDados: conteúdo mostrado no lugar da lista quando `mostrarSemDados(pagina)` for verdadeiro
 */
export function RankingTabela({ carregar, metrica, user, onVerPerfil, onDados, semDados, mostrarSemDados }) {
  const [pagina, setPagina] = useState(0);
  const [busca, setBusca] = useState("");
  const [buscaAplicada, setBuscaAplicada] = useState("");
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  // Espera o usuário parar de digitar antes de consultar
  useEffect(() => {
    const timer = setTimeout(() => {
      setBuscaAplicada(busca.trim());
      setPagina(0);
    }, 350);
    return () => clearTimeout(timer);
  }, [busca]);

  useEffect(() => {
    let ativo = true;
    setLoading(true);
    setErro("");
    carregar({ pagina, busca: buscaAplicada })
      .then((resultado) => {
        if (!ativo) return;
        setDados(resultado);
        onDados?.(resultado);
      })
      .catch((err) => ativo && setErro(mensagemDeErro(err)))
      .finally(() => ativo && setLoading(false));
    return () => { ativo = false; };
    // onDados fica de fora: só a consulta deve disparar uma nova carga
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carregar, pagina, buscaAplicada]);

  if (dados && mostrarSemDados?.(dados)) {
    return semDados;
  }

  const itens = dados?.itens || [];

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="search"
          aria-label="Buscar participante pelo nome"
          placeholder="Buscar participante pelo nome..."
          value={busca}
          maxLength={60}
          onChange={(e) => setBusca(e.target.value)}
          className={`${inputClass} pl-10`}
        />
      </div>

      {erro ? (
        <EmptyState icon={Trophy} title="Não foi possível carregar o ranking" text={erro} />
      ) : loading && !dados ? (
        <div className="py-10 text-center text-sm text-slate-400 font-medium animate-pulse">Carregando ranking...</div>
      ) : itens.length === 0 ? (
        <EmptyState
          icon={Search}
          title={buscaAplicada ? "Ninguém encontrado" : "Ainda não há participantes"}
          text={buscaAplicada ? `Nenhum participante com "${buscaAplicada}" no nome.` : "Quando alguém entrar, a classificação aparece aqui."}
        />
      ) : (
        <div className={`transition-opacity ${loading ? "opacity-50" : ""}`}>
          {itens.map((p) => {
            const souEu = p.id === user.id;
            const local = formatarLocal(p);
            return (
              <button
                type="button"
                key={p.id}
                onClick={() => onVerPerfil?.(p.id)}
                className={`w-full text-left px-3 py-3 flex items-center gap-3 border-b border-slate-100 last:border-0 transition ${
                  souEu ? "" : "hover:bg-slate-50"
                }`}
                // A linha do próprio usuário ganha uma faixa lateral na cor da paleta
                style={souEu ? {
                  boxShadow: "inset 4px 0 0 var(--color-primary)",
                  background: "color-mix(in srgb, var(--color-primary) 8%, transparent)",
                } : undefined}
              >
                {/* Posição com ícone (pódio) ou número */}
                <div className="w-9 flex justify-center shrink-0">
                  {p.posicao === 1 ? (
                    <Trophy className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                  ) : p.posicao === 2 ? (
                    <Medal className="w-5 h-5 text-slate-400 fill-slate-400" />
                  ) : p.posicao === 3 ? (
                    <Medal className="w-5 h-5 text-amber-700 fill-amber-700" />
                  ) : (
                    <span className="text-slate-400 text-sm font-black">{p.posicao}º</span>
                  )}
                </div>

                <Avatar nome={p.nome} avatarUrl={p.avatarUrl} className="w-9 h-9 text-sm" />

                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-slate-800 text-sm truncate">
                    {p.nome}
                    {souEu && <span className="ml-1.5 text-[10px] font-bold" style={{ color: "var(--color-primary)" }}>você</span>}
                  </p>
                  <p className="text-[11px] text-slate-500 font-semibold mt-0.5 truncate">
                    Nível {p.nivel}{local && ` · ${local}`}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-sm font-black text-slate-800">{formatarMetrica(metrica, p)}</p>
                  <p className="text-[10px] text-slate-400 font-bold">
                    {formatarMetrica(metrica === "XP" ? "SALDO" : "XP", p)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Paginação */}
      {dados && dados.totalPaginas > 1 && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-slate-400 font-semibold">
            Página {dados.pagina + 1} de {dados.totalPaginas} · {dados.total} {dados.total === 1 ? "participante" : "participantes"}
          </p>
          <div className="flex gap-2">
            <IconButton icon={ChevronLeft} label="Página anterior" disabled={pagina === 0 || loading}
              className="disabled:opacity-40" onClick={() => setPagina((n) => Math.max(n - 1, 0))} />
            <IconButton icon={ChevronRight} label="Próxima página" disabled={pagina + 1 >= dados.totalPaginas || loading}
              className="disabled:opacity-40" onClick={() => setPagina((n) => n + 1)} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PERFIL PÚBLICO ──────────────────────────────────────────────────────────
const NOMES_MEDALHA = {
  first_lesson: "Primeira Aula",
  "Primeira Aula": "Primeira Aula",
  first_simulation: "Primeira Simulação",
  "Simulador Pro": "Primeiro Simulador",
  module_complete: "Módulo Completo",
};

export function PerfilPublicoModal({ perfilId, onClose }) {
  const [perfil, setPerfil] = useState(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let ativo = true;
    api.get(`/api/rankings/perfis/${perfilId}`)
      .then((p) => ativo && setPerfil(p))
      .catch((err) => ativo && setErro(mensagemDeErro(err)));
    return () => { ativo = false; };
  }, [perfilId]);

  return (
    <Modal title="Perfil do participante" onClose={onClose}>
      {erro ? (
        <p className="text-sm font-bold text-red-600">{erro}</p>
      ) : !perfil ? (
        <p className="text-sm text-slate-400 font-medium animate-pulse py-6 text-center">Carregando perfil...</p>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar nome={perfil.nome} avatarUrl={perfil.avatarUrl} className="w-16 h-16 text-2xl" />
            <div className="min-w-0">
              <p className="text-lg font-black text-slate-800 truncate">{perfil.nome}</p>
              {formatarLocal(perfil) && (
                <p className="text-xs text-slate-500 font-semibold flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" /> {formatarLocal(perfil)}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-slate-50 border border-slate-100 rounded-sm p-3">
              <p className="text-lg font-black text-slate-800">{perfil.posicaoGlobal ? `${perfil.posicaoGlobal}º` : "—"}</p>
              <p className="text-[10px] font-bold text-slate-400">Ranking global</p>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-sm p-3">
              <p className="text-lg font-black text-slate-800">{perfil.xp.toLocaleString("pt-BR")}</p>
              <p className="text-[10px] font-bold text-slate-400">XP · Nível {perfil.nivel}</p>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-sm p-3">
              <p className="text-lg font-black text-slate-800">
                {perfil.saldoVirtual.toLocaleString("pt-BR", { notation: "compact", maximumFractionDigits: 1 })}
              </p>
              <p className="text-[10px] font-bold text-slate-400">Saldo (R$)</p>
            </div>
          </div>

          <div>
            <p className={labelClass}>Conquistas</p>
            {perfil.medalhas.length === 0 ? (
              <p className="text-sm text-slate-400 italic">Nenhuma conquista ainda.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {perfil.medalhas.map((m) => (
                  <span key={m} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold"
                    style={{ background: "var(--color-accent)", color: "var(--color-text-on-primary)" }}>
                    <Award className="w-3 h-3" /> {NOMES_MEDALHA[m] || m}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
