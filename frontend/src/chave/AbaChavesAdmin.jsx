/**
 * Aba "Chaves" do painel do administrador:
 * - Chave do administrador: criar, carregar (do pendrive) ou substituir. Enquanto ela existir,
 *   as ações do painel que mexem em dados de usuários precisam ser assinadas com ela.
 * - Chaves dos usuários: aprovar as pendentes (de quem perdeu a chave antiga) e revogar as ativas.
 */

import { useEffect, useState } from "react";
import { Ban, Check, FileKey2, KeyRound, LogOut, RefreshCw, ShieldCheck } from "lucide-react";
import { api } from "../api";
import { toast } from "../motion";
import { Button } from "../components/ui";
import CarregarChave from "./CarregarChave";
import CriarChave from "./CriarChave";
import { impressaoDigital } from "./cripto";
import { assinarCadastro, descarregarChave, useChaveCarregada } from "./sessao";

const DONO_ADMIN = { tipo: "admin", nome: "Administrador" };

export default function AbaChavesAdmin({ password, statusAdmin, onStatusAlterado, assinarAdmin }) {
  const carregada = useChaveCarregada("admin");
  const [modo, setModo] = useState(null); // "criar" | "carregar"
  const [chaves, setChaves] = useState(null);
  const [ocupado, setOcupado] = useState(null);
  const [erro, setErro] = useState("");

  const chaveAdmin = statusAdmin?.chave;
  const adminCarregada = chaveAdmin && carregada?.chavePublica === chaveAdmin.chavePublica;

  async function carregarLista() {
    try {
      setChaves(await api.post("/api/admin/chaves/listar", { password }));
    } catch (err) {
      setErro(err.message);
    }
  }

  useEffect(() => {
    carregarLista();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function registrarChaveAdmin({ semente, chavePublica }) {
    const { payload, assinatura } = assinarCadastro(semente, { tipo: "ADMIN_CHAVE_CADASTRADA", chavePublica });
    return api.post("/api/admin/chave", { password, payload, assinatura });
  }

  async function agir(item, acao) {
    setErro("");
    setOcupado(item.chave.id);
    try {
      const tipo = acao === "aprovar" ? "ADMIN_CHAVE_APROVADA" : "ADMIN_CHAVE_REVOGADA";
      const assinaturaAdmin = await assinarAdmin(tipo, item.chave.usuarioId, { chaveId: item.chave.id });
      await api.post(`/api/admin/chaves/${item.chave.id}/${acao}`, { password, assinaturaAdmin });
      toast(acao === "aprovar" ? `Chave de ${item.nome} aprovada.` : `Chave de ${item.nome} revogada.`);
      await carregarLista();
    } catch (err) {
      setErro(err.message);
    } finally {
      setOcupado(null);
    }
  }

  const pendentes = (chaves ?? []).filter((c) => c.chave.status === "PENDENTE");
  const ativas = (chaves ?? []).filter((c) => c.chave.status === "ATIVA");

  return (
    <div className="p-5 space-y-5 overflow-y-auto flex-1 min-h-0">
      {/* ── Chave do administrador ── */}
      <section className="space-y-3">
        <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-indigo-500" /> Chave do administrador
        </h3>

        {modo === "criar" ? (
          <>
            <p className="text-xs text-slate-500">
              {chaveAdmin
                ? "A chave atual será substituída e deixará de valer. A troca fica registrada."
                : "Depois de criada, saldo, reset da trilha e aprovação de chaves só funcionam com ela carregada."}
            </p>
            <CriarChave
              vaga="admin"
              dono={DONO_ADMIN}
              pedirSenhaConta={false}
              onRegistrar={registrarChaveAdmin}
              onConcluir={() => { setModo(null); onStatusAlterado(); toast("Chave do administrador ativada."); }}
            />
          </>
        ) : modo === "carregar" ? (
          <CarregarChave
            vaga="admin"
            dono={DONO_ADMIN}
            esperada={chaveAdmin?.chavePublica}
            onCarregada={() => { setModo(null); toast("Chave do administrador carregada."); }}
          />
        ) : chaveAdmin ? (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-bold text-slate-800">{impressaoDigital(chaveAdmin.chavePublica)}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${adminCarregada ? "bg-indigo-100 text-indigo-800" : "bg-slate-100 text-slate-500"}`}>
                {adminCarregada ? "Carregada" : "Não carregada"}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {adminCarregada ? (
                <Button variant="secondary" icon={LogOut} onClick={() => descarregarChave("admin")}>Descarregar</Button>
              ) : (
                <Button icon={FileKey2} onClick={() => setModo("carregar")}>Carregar chave</Button>
              )}
              <Button variant="ghost" icon={RefreshCw} onClick={() => setModo("criar")}>Substituir chave</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-slate-500 leading-relaxed">
              Sem chave, o painel funciona só com a senha. Com uma chave de administrador, cada ação sobre dados de
              usuários é assinada e fica registrada na corrente com essa assinatura.
            </p>
            <Button icon={KeyRound} onClick={() => setModo("criar")}>Criar chave do administrador</Button>
          </div>
        )}

        {modo && modo !== "criar" && (
          <button type="button" onClick={() => setModo(null)} className="text-xs font-bold text-slate-400 hover:text-slate-600">
            Cancelar
          </button>
        )}
        {modo === "criar" && (
          <button type="button" onClick={() => setModo(null)} className="text-xs font-bold text-slate-400 hover:text-slate-600">
            Voltar
          </button>
        )}
      </section>

      {/* ── Chaves dos usuários ── */}
      <section className="space-y-3 border-t border-slate-100 pt-4">
        <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
          <KeyRound className="w-4 h-4 text-indigo-500" /> Chaves dos usuários
        </h3>
        {erro && <p role="alert" className="text-xs font-bold text-red-700">{erro}</p>}
        {!chaves ? (
          <p className="text-xs text-slate-400 animate-pulse">Carregando...</p>
        ) : (
          <>
            <ListaChaves
              titulo="Aguardando aprovação"
              vazio="Nenhuma chave pendente."
              itens={pendentes}
              ocupado={ocupado}
              acoes={(item) => (
                <>
                  <Button icon={Check} disabled={ocupado != null} onClick={() => agir(item, "aprovar")} className="py-1.5">Aprovar</Button>
                  <Button variant="ghost" icon={Ban} disabled={ocupado != null} onClick={() => agir(item, "revogar")} className="py-1.5 text-red-600">Recusar</Button>
                </>
              )}
            />
            <ListaChaves
              titulo="Ativas"
              vazio="Nenhum usuário com chave ativa."
              itens={ativas}
              ocupado={ocupado}
              acoes={(item) => (
                <Button variant="ghost" icon={Ban} disabled={ocupado != null} onClick={() => agir(item, "revogar")} className="py-1.5 text-red-600">Revogar</Button>
              )}
            />
          </>
        )}
      </section>
    </div>
  );
}

function ListaChaves({ titulo, vazio, itens, acoes, ocupado }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{titulo}</p>
      {itens.length === 0 ? (
        <p className="text-xs text-slate-400">{vazio}</p>
      ) : (
        <ul className="divide-y divide-slate-100 border border-slate-100 rounded-sm">
          {itens.map((item) => (
            <li key={item.chave.id} className={`px-3 py-2 flex flex-wrap items-center justify-between gap-2 ${ocupado === item.chave.id ? "opacity-60" : ""}`}>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">{item.nome}</p>
                <p className="text-[10px] text-slate-400 truncate">
                  {item.email} · <span className="font-mono">{impressaoDigital(item.chave.chavePublica)}</span>
                </p>
              </div>
              <div className="flex gap-1.5 shrink-0">{acoes(item)}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
