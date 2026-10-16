/**
 * Noticias.jsx — Aba de notícias de economia e finanças
 *
 * Busca os artigos no backend (/api/blog/news), que consulta a NewsAPI.
 * O usuário escolhe um tema pronto ou digita o próprio termo de busca.
 */

import { useState, useEffect } from "react";
import { Search, Newspaper, ExternalLink, RefreshCw } from "lucide-react";
import { api } from "../api";
import { EmptyState, Button } from "./ui";

// Temas prontos: cada um vira o parâmetro q da busca
const TOPICS = [
  { id: "geral", label: "Destaques", q: 'investimentos OR economia OR finanças OR "educação financeira"' },
  { id: "investimentos", label: "Investimentos", q: 'investimentos OR "renda fixa" OR "tesouro direto"' },
  { id: "juros", label: "Juros e inflação", q: "Selic OR Copom OR inflação OR IPCA" },
  { id: "bolsa", label: "Bolsa", q: "Ibovespa OR B3 OR ações OR dividendos" },
  { id: "cripto", label: "Cripto", q: "bitcoin OR criptomoedas" },
  { id: "financas", label: "Finanças pessoais", q: '"finanças pessoais" OR "educação financeira" OR endividamento' },
];

function formatarData(iso) {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return "";
  return data.toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function ArticleCard({ article }) {
  const [imageOk, setImageOk] = useState(Boolean(article.urlToImage));

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="mi-lift group bg-white rounded-sm shadow-sm border border-slate-100 hover:border-indigo-200 hover:shadow-md flex flex-col min-w-0 overflow-hidden"
      data-finbot-context={`Notícia: "${article.title}", publicada por ${article.source?.name || "fonte desconhecida"}. ${article.description || ""}`}
    >
      {imageOk ? (
        <img
          src={article.urlToImage}
          alt=""
          loading="lazy"
          onError={() => setImageOk(false)}
          className="w-full h-40 object-cover bg-slate-100"
        />
      ) : (
        <div className="w-full h-40 bg-slate-100 flex items-center justify-center">
          <Newspaper className="w-8 h-8 text-slate-400" />
        </div>
      )}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          <span className="truncate">{article.source?.name}</span>
          <span className="shrink-0">{formatarData(article.publishedAt)}</span>
        </div>
        <h3 className="text-sm font-bold text-slate-800 leading-snug group-hover:text-indigo-700 transition">
          {article.title}
        </h3>
        {article.description && (
          <p className="text-xs text-slate-500 font-medium leading-relaxed line-clamp-3">{article.description}</p>
        )}
        <span className="mt-auto pt-1 flex items-center gap-1 text-[11px] font-bold text-indigo-600">
          Ler na fonte
          <ExternalLink className="w-3 h-3" />
        </span>
      </div>
    </a>
  );
}

export default function Noticias() {
  const [topicId, setTopicId] = useState(TOPICS[0].id);
  const [search, setSearch] = useState("");
  // Termo de busca em uso; quando vazio vale o tema selecionado
  const [customQuery, setCustomQuery] = useState("");
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const query = customQuery || TOPICS.find((t) => t.id === topicId).q;

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      setLoading(true);
      setError("");
      try {
        const data = await api.get(`/api/blog/news?q=${encodeURIComponent(query)}&lang=pt`);
        if (cancelado) return;
        // A NewsAPI devolve artigos apagados com o título "[Removed]"
        setArticles(
          (data.articles || []).filter(
            (a) => a.title && a.title !== "[Removed]" && /^https?:\/\//.test(a.url || "")
          )
        );
      } catch (err) {
        console.error("Erro ao carregar notícias:", err);
        if (!cancelado) {
          setArticles([]);
          setError("Não foi possível carregar as notícias agora. Tente novamente em instantes.");
        }
      } finally {
        if (!cancelado) setLoading(false);
      }
    }

    carregar();
    return () => { cancelado = true; };
  }, [query, reloadKey]);

  const handleSearch = (e) => {
    e.preventDefault();
    setCustomQuery(search.trim());
  };

  const handleTopic = (id) => {
    setTopicId(id);
    setSearch("");
    setCustomQuery("");
  };

  return (
    <div className="px-4 md:px-8 pt-2 pb-8 space-y-6 animate-[fadeIn_0.3s_ease-out]">
      {/* Busca */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar notícias por assunto, empresa ou ativo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-semibold bg-white"
          />
        </div>
        <Button type="submit" icon={Search} disabled={!search.trim()}>Buscar</Button>
      </form>

      {/* Temas */}
      <div className="flex flex-wrap items-center gap-2">
        {TOPICS.map((t) => {
          const active = !customQuery && t.id === topicId;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => handleTopic(t.id)}
              aria-pressed={active}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition ${active
                ? "border-transparent shadow-sm"
                : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              style={active ? { background: "var(--color-primary)", color: "var(--color-text-on-primary)" } : undefined}
            >
              {t.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setReloadKey((k) => k + 1)}
          title="Atualizar"
          aria-label="Atualizar notícias"
          className="ml-auto w-8 h-8 rounded-full flex items-center justify-center bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {customQuery && (
        <p className="text-xs text-slate-500 font-medium">
          Resultados para <strong className="text-slate-700">“{customQuery}”</strong>
        </p>
      )}

      {/* Lista */}
      {loading ? (
        <p className="text-xs text-slate-400 text-center py-12 animate-pulse">Carregando notícias...</p>
      ) : error ? (
        <EmptyState
          icon={Newspaper}
          title="Notícias indisponíveis"
          text={error}
          action={<Button variant="secondary" icon={RefreshCw} onClick={() => setReloadKey((k) => k + 1)}>Tentar de novo</Button>}
        />
      ) : articles.length === 0 ? (
        <EmptyState icon={Newspaper} title="Nenhuma notícia encontrada" text="Tente outro tema ou outro termo de busca." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {articles.map((a) => (
            <ArticleCard key={a.url} article={a} />
          ))}
        </div>
      )}
    </div>
  );
}
