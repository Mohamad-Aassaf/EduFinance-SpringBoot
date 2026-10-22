/**
 * Mostra o resultado de /api/registros/verificar: se a corrente está inteira e, para cada
 * registro do usuário, se a assinatura confere e se o banco ainda bate com o que foi assinado.
 */

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Link2, Loader2, ShieldCheck, ShieldX } from "lucide-react";
import { api } from "../api";
import JanelaChave from "./JanelaChave";

const TIPOS = {
  COMPRA: "Compra",
  VENDA: "Venda",
  AULA_CONCLUIDA: "Aula concluída",
  CHAVE_CADASTRADA: "Chave cadastrada",
  CHAVE_REVOGADA: "Chave revogada",
  CHAVE_PEDIDO_CANCELADO: "Pedido de chave cancelado",
  CONFIG_EXIGIR_CHAVE: "Login só com chave alterado",
  ADMIN_SALDO: "Saldo alterado pelo admin",
  ADMIN_RESET_TRILHA: "Trilha resetada pelo admin",
  ADMIN_CHAVE_APROVADA: "Chave aprovada pelo admin",
  ADMIN_CHAVE_REVOGADA: "Chave revogada pelo admin",
};

function descrever(r) {
  const d = r.dados || {};
  switch (r.tipo) {
    case "COMPRA":
    case "VENDA":
      return `${d.quantity} × ${d.stockCode} a R$ ${Number(d.price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
    case "AULA_CONCLUIDA":
      return d.titulo || `Aula ${d.licaoId}`;
    case "ADMIN_SALDO":
      return `Novo saldo: R$ ${Number(d.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
    case "CONFIG_EXIGIR_CHAVE":
      return d.ativo ? "Login só com a chave: ligado" : "Login só com a chave: desligado";
    case "ADMIN_RESET_TRILHA":
      return d.aulasRemovidas != null ? `${d.aulasRemovidas} aula(s) removida(s)` : "";
    default:
      return "";
  }
}

function Selo({ tom, children }) {
  const cores = {
    ok: "bg-emerald-50 text-emerald-700 border-emerald-200",
    neutro: "bg-slate-50 text-slate-500 border-slate-200",
    erro: "bg-red-50 text-red-700 border-red-200",
  };
  return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border whitespace-nowrap ${cores[tom]}`}>{children}</span>;
}

export default function VerificarRegistros({ onFechar }) {
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    api.get("/api/registros/verificar").then(setResultado).catch((e) => setErro(e.message || "Falha ao verificar."));
  }, []);

  const registros = resultado ? [...resultado.registros].reverse() : [];

  return (
    <JanelaChave titulo="Verificação dos registros" icone={ShieldCheck} onFechar={onFechar} largura="max-w-xl">
      {!resultado && !erro && (
        <div className="flex flex-col items-center gap-2 py-8 text-xs text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          Conferindo a corrente e as assinaturas...
        </div>
      )}
      {erro && <p role="alert" className="text-xs font-bold text-red-700">{erro}</p>}

      {resultado && (
        <div className="space-y-4">
          <div
            className={`p-3 rounded-lg border flex items-start gap-2.5 ${
              resultado.tudoCerto ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            {resultado.tudoCerto ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <ShieldX className="w-5 h-5 shrink-0" />}
            <div className="text-xs">
              <p className="font-extrabold">
                {resultado.tudoCerto ? "Nenhuma adulteração encontrada." : "Foram encontrados problemas."}
              </p>
              <p className="mt-0.5 opacity-80">
                {resultado.correnteIntegra
                  ? `A corrente de ${resultado.totalBlocos} registro(s) está inteira.`
                  : `A corrente está quebrada a partir do registro #${resultado.quebraEm}: algo foi alterado ou apagado.`}
              </p>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 flex items-center gap-1.5 min-w-0">
            <Link2 className="w-3.5 h-3.5 shrink-0" />
            <span className="shrink-0">Último hash:</span>
            <code className="font-mono truncate">{resultado.ultimoHash}</code>
          </p>

          {resultado.operacoesSemRegistro.length > 0 && (
            <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-xs space-y-1">
              <p className="font-extrabold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> Operações no banco que não passaram pelo app
              </p>
              {resultado.operacoesSemRegistro.map((o) => (
                <p key={o.id}>• {o.descricao}</p>
              ))}
            </div>
          )}

          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Seus registros</p>
            {registros.length === 0 ? (
              <p className="text-xs text-slate-400">Nenhum registro ainda.</p>
            ) : (
              <ul className="divide-y divide-slate-100 border border-slate-100 rounded-sm">
                {registros.map((r) => (
                  <li key={r.id} className="px-3 py-2.5 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-800 truncate">
                        #{r.id} · {TIPOS[r.tipo] || r.tipo}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {new Date(r.criadoEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                      </span>
                    </div>
                    {descrever(r) && <p className="text-[11px] text-slate-500">{descrever(r)}</p>}
                    <div className="flex flex-wrap gap-1">
                      {r.assinatura === "VALIDA" && <Selo tom="ok">Assinatura válida</Selo>}
                      {r.assinatura === "SEM_ASSINATURA" && <Selo tom="neutro">Sem assinatura</Selo>}
                      {r.assinatura === "INVALIDA" && <Selo tom="erro">Assinatura inválida</Selo>}
                      {r.conferencia === "CONFERE" && <Selo tom="ok">Banco confere</Selo>}
                      {r.conferencia === "DIVERGENTE" && <Selo tom="erro">Banco alterado</Selo>}
                      {r.conferencia === "AUSENTE" && <Selo tom="erro">Sumiu do banco</Selo>}
                      {r.naCorrenteQuebrada && <Selo tom="erro">Corrente quebrada</Selo>}
                    </div>
                    {r.detalhe && <p className="text-[11px] text-slate-400">{r.detalhe}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </JanelaChave>
  );
}
