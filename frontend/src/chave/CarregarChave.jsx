/**
 * Formulário para carregar a chave digital, de três jeitos:
 * - "Lembrada": o arquivo já está salvo neste navegador; só falta a senha da chave.
 * - "Arquivo": a pessoa escolhe o arquivo (do pendrive, por exemplo) e digita a senha.
 * - "12 palavras": recria a chave a partir da frase de recuperação.
 *
 * Se `esperada` for informada, só aceita a chave com essa chave pública.
 */

import { useRef, useState } from "react";
import { FileKey2, KeyRound, ListOrdered, Usb } from "lucide-react";
import { Button, inputClass, labelClass } from "../components/ui";
import { abrirArquivo, chaveDaFrase, impressaoDigital } from "./cripto";
import { arquivoLembrado, carregarChave, lembrarArquivo, lerArquivoDoDisco } from "./sessao";

const MODOS = [
  { id: "lembrada", label: "Neste computador", icon: KeyRound },
  { id: "arquivo", label: "Arquivo / pendrive", icon: Usb },
  { id: "palavras", label: "12 palavras", icon: ListOrdered },
];

export default function CarregarChave({ vaga = "usuario", dono, esperada, onCarregada, rotuloBotao = "Carregar chave" }) {
  const lembrado = arquivoLembrado(dono);
  const [modo, setModo] = useState(lembrado ? "lembrada" : "arquivo");
  const [arquivo, setArquivo] = useState(null);
  const [senha, setSenha] = useState("");
  const [frase, setFrase] = useState("");
  const [lembrar, setLembrar] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const inputArquivo = useRef(null);

  const modos = MODOS.filter((m) => m.id !== "lembrada" || lembrado);

  async function escolherArquivo(e) {
    setErro("");
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const lido = await lerArquivoDoDisco(file);
      if (lido.tipo !== dono.tipo) {
        throw new Error(dono.tipo === "admin" ? "Esse arquivo é de um usuário, não do administrador." : "Esse arquivo é da chave do administrador.");
      }
      setArquivo(lido);
    } catch (err) {
      setArquivo(null);
      setErro(err.message);
    }
  }

  async function carregar(e) {
    e.preventDefault();
    setErro("");
    setCarregando(true);
    try {
      let semente;
      let chavePublica;
      if (modo === "palavras") {
        ({ semente, chavePublica } = chaveDaFrase(frase));
      } else {
        const fonte = modo === "lembrada" ? lembrado : arquivo;
        if (!fonte) throw new Error("Escolha o arquivo da chave.");
        semente = await abrirArquivo(fonte, senha);
        chavePublica = fonte.chavePublica;
        if (modo === "arquivo" && lembrar) lembrarArquivo(fonte);
      }

      if (esperada && chavePublica !== esperada) {
        semente.fill(0);
        throw new Error(
          `Essa não é a chave ativa (${impressaoDigital(chavePublica)}). A chave esperada é ${impressaoDigital(esperada)}.`
        );
      }

      carregarChave(vaga, semente, chavePublica);
      setSenha("");
      setFrase("");
      onCarregada?.({ chavePublica });
    } catch (err) {
      setErro(err.message || "Não foi possível carregar a chave.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <form onSubmit={carregar} className="space-y-3">
      {modos.length > 1 && (
        <div role="tablist" className="grid gap-1 p-1 bg-slate-100 rounded-sm" style={{ gridTemplateColumns: `repeat(${modos.length}, 1fr)` }}>
          {modos.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={modo === id}
              onClick={() => { setModo(id); setErro(""); }}
              className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-sm text-[11px] font-bold transition ${
                modo === id ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </div>
      )}

      {modo === "lembrada" && lembrado && (
        <p className="text-xs text-slate-500">
          Chave salva neste navegador: <strong className="font-mono text-slate-700">{impressaoDigital(lembrado.chavePublica)}</strong>
        </p>
      )}

      {modo === "arquivo" && (
        <div className="space-y-2">
          <input ref={inputArquivo} type="file" accept=".json,application/json" onChange={escolherArquivo} className="hidden" />
          <button
            type="button"
            onClick={() => inputArquivo.current?.click()}
            className="w-full flex items-center gap-3 p-3 rounded-sm border-2 border-dashed border-slate-200 hover:border-slate-300 text-left transition"
          >
            <FileKey2 className="w-5 h-5 text-slate-400 shrink-0" />
            <span className="min-w-0">
              <span className="block text-xs font-bold text-slate-700 truncate">
                {arquivo ? `Chave ${impressaoDigital(arquivo.chavePublica)}` : "Escolher arquivo da chave"}
              </span>
              <span className="block text-[11px] text-slate-400 truncate">
                {arquivo ? arquivo.email || "Chave do administrador" : "edufinance-chave-….json"}
              </span>
            </span>
          </button>
          <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
            <input type="checkbox" checked={lembrar} onChange={(e) => setLembrar(e.target.checked)} />
            Lembrar neste computador (o arquivo fica cifrado; a senha continua sendo pedida)
          </label>
        </div>
      )}

      {modo !== "palavras" ? (
        <div>
          <label htmlFor={`senha-chave-${vaga}`} className={labelClass}>Senha da chave</label>
          <input
            id={`senha-chave-${vaga}`}
            type="password"
            autoComplete="off"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className={inputClass}
          />
        </div>
      ) : (
        <div>
          <label htmlFor={`frase-${vaga}`} className={labelClass}>As 12 palavras, na ordem</label>
          <textarea
            id={`frase-${vaga}`}
            rows={3}
            autoComplete="off"
            spellCheck={false}
            value={frase}
            onChange={(e) => setFrase(e.target.value)}
            placeholder="palavra1 palavra2 palavra3 …"
            className={`${inputClass} font-mono resize-none`}
          />
        </div>
      )}

      {erro && <p role="alert" className="text-xs font-bold text-red-700">{erro}</p>}

      <Button
        type="submit"
        icon={KeyRound}
        disabled={carregando || (modo === "palavras" ? !frase.trim() : !senha || (modo === "arquivo" && !arquivo))}
        className="w-full py-2.5"
      >
        {carregando ? "Abrindo a chave..." : rotuloBotao}
      </Button>
    </form>
  );
}
