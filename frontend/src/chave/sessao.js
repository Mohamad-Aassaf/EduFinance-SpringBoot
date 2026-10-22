/**
 * Onde a chave fica enquanto o app está aberto, e as funções que assinam as ações.
 *
 * - A chave privada só fica na memória (nesta variável do módulo, fora do estado do React).
 *   Recarregar a página ou sair da conta a descarta.
 * - "Lembrar neste computador" guarda no navegador só o ARQUIVO da chave, que é cifrado:
 *   para usar, a pessoa ainda digita a senha da chave.
 * - Há duas vagas: a chave do usuário e a do administrador (usada só no painel de admin).
 */

import { useSyncExternalStore } from "react";
import { api } from "../api";
import { assinarTexto, criarArquivo, impressaoDigital, lerArquivo } from "./cripto";

const vagas = { usuario: null, admin: null };
const resumos = { usuario: null, admin: null };
let pedido = null; // { chavePublica, dono, resolver, rejeitar }
const ouvintes = new Set();

function avisar() {
  ouvintes.forEach((f) => f());
}

function assinarMudancas(f) {
  ouvintes.add(f);
  return () => ouvintes.delete(f);
}

// ── Chave carregada ───────────────────────────────────────────────────────

export function carregarChave(vaga, semente, chavePublica) {
  vagas[vaga] = { semente, chavePublica };
  resumos[vaga] = { chavePublica, impressao: impressaoDigital(chavePublica) };
  avisar();
}

export function descarregarChave(vaga) {
  if (vagas[vaga]) vagas[vaga].semente.fill(0);
  vagas[vaga] = null;
  resumos[vaga] = null;
  avisar();
}

/** Resumo da chave carregada na vaga ({ chavePublica, impressao }) ou null. Nunca expõe a chave privada. */
export function useChaveCarregada(vaga) {
  return useSyncExternalStore(assinarMudancas, () => resumos[vaga]);
}

export function chaveCarregada(vaga) {
  return resumos[vaga];
}

/** Gera um arquivo novo da chave carregada, com outra senha (para uma cópia extra ou trocar a senha). */
export function exportarArquivo(vaga, senha, dono) {
  if (!vagas[vaga]) throw new Error("Carregue a chave antes de baixar uma cópia.");
  return criarArquivo(vagas[vaga].semente, vagas[vaga].chavePublica, senha, dono);
}

function assinarNaVaga(vaga, texto) {
  if (!vagas[vaga]) throw new Error("Nenhuma chave carregada.");
  return assinarTexto(texto, vagas[vaga].semente);
}

// ── Pedido para carregar a chave (abre o PedidoChaveModal) ────────────────

/** Abre a janela pedindo a chave e espera a pessoa carregá-la (ou cancelar). */
export function pedirChave(chavePublica, dono) {
  if (pedido) pedido.rejeitar(new Error("Operação cancelada."));
  return new Promise((resolver, rejeitar) => {
    pedido = { chavePublica, dono, resolver, rejeitar };
    avisar();
  });
}

export function usePedidoChave() {
  return useSyncExternalStore(assinarMudancas, () => pedido);
}

export function concluirPedido() {
  const atual = pedido;
  pedido = null;
  avisar();
  atual?.resolver();
}

export function cancelarPedido() {
  const atual = pedido;
  pedido = null;
  avisar();
  atual?.rejeitar(new Error("Operação cancelada: sua conta usa chave digital e a chave não foi carregada."));
}

// ── Assinatura de ações ───────────────────────────────────────────────────

/**
 * Assina uma ação do usuário, se a conta tiver chave ativa.
 * Devolve { payload, assinatura } para mandar no corpo da requisição, ou null se a conta não usa chave.
 * Se a chave não estiver carregada, pede para a pessoa carregá-la antes.
 */
export async function assinarAcao(user, tipo, dados) {
  const { chave, ultimaSequencia, contaUsaChave } = await api.get("/api/chaves/me");
  if (!chave) {
    // Conta que já teve chave não volta a operar sem assinatura (o servidor também recusa)
    if (contaUsaChave) {
      throw new Error("Sua conta usa chave digital, mas está sem chave ativa. Veja o cartão Chave digital no Perfil.");
    }
    return null;
  }

  if (resumos.usuario?.chavePublica !== chave.chavePublica) {
    await pedirChave(chave.chavePublica, { tipo: "usuario", usuarioId: user.id, nome: user.nome, email: user.email });
  }

  const payload = JSON.stringify({
    tipo,
    usuarioId: user.id,
    sequencia: ultimaSequencia + 1,
    data: new Date().toISOString(),
    ...dados,
  });
  return { payload, assinatura: assinarNaVaga("usuario", payload) };
}

/**
 * Assina uma ação do administrador. `status` vem de /api/admin/chave/status.
 * Devolve undefined quando não existe chave de administrador (a ação segue só com a senha).
 */
export function assinarComoAdmin(status, tipo, usuarioId, dados = {}) {
  if (!status?.chave) return undefined;
  if (resumos.admin?.chavePublica !== status.chave.chavePublica) {
    throw new Error("Carregue a chave do administrador (aba Chaves) para assinar esta ação.");
  }
  const payload = JSON.stringify({
    tipo,
    usuarioId,
    sequencia: status.ultimaSequencia + 1,
    data: new Date().toISOString(),
    ...dados,
  });
  return { payload, assinatura: assinarNaVaga("admin", payload) };
}

/** Assina o pedido de cadastro de uma chave nova com ela mesma (prova de que a pessoa tem a chave). */
export function assinarCadastro(semente, dados) {
  const payload = JSON.stringify({ ...dados, data: new Date().toISOString() });
  return { payload, assinatura: assinarTexto(payload, semente) };
}

/** Assina o desafio do login. Só aceita textos de login, nunca uma operação. */
export function assinarDesafioLogin(mensagem, email, semente) {
  if (!mensagem.startsWith("EduFinance login\n") || mensagem.split("\n")[1] !== email) {
    throw new Error("Desafio de login inválido.");
  }
  return assinarTexto(mensagem, semente);
}

// ── Arquivo: baixar, abrir e lembrar ──────────────────────────────────────

export function baixarArquivo(arquivo) {
  const nome = (arquivo.tipo === "admin" ? "administrador" : arquivo.nome || "usuario")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .toLowerCase();
  const blob = new Blob([JSON.stringify(arquivo, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `edufinance-chave-${nome}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function lerArquivoDoDisco(file) {
  if (file.size > 20000) throw new Error("Esse arquivo não é uma chave do EduFinance.");
  return lerArquivo(await file.text());
}

const PREFIXO_LEMBRADA = "edufinance-chave:";

function chaveLembrada(dono) {
  return `${PREFIXO_LEMBRADA}${dono.tipo}:${dono.tipo === "admin" ? "admin" : dono.usuarioId}`;
}

export function lembrarArquivo(arquivo) {
  try {
    localStorage.setItem(chaveLembrada(arquivo), JSON.stringify(arquivo));
  } catch {
    /* sem armazenamento: só não lembra */
  }
}

export function arquivoLembrado(dono) {
  try {
    const texto = localStorage.getItem(chaveLembrada(dono));
    return texto ? lerArquivo(texto) : null;
  } catch {
    return null;
  }
}

export function esquecerArquivo(dono) {
  try {
    localStorage.removeItem(chaveLembrada(dono));
  } catch {
    /* nada a fazer */
  }
}

/** Arquivos de usuário lembrados neste computador (para o login com chave). */
export function arquivosLembradosDeUsuarios() {
  const lista = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(`${PREFIXO_LEMBRADA}usuario:`)) {
        try {
          lista.push(lerArquivo(localStorage.getItem(k)));
        } catch {
          /* ignora arquivos corrompidos */
        }
      }
    }
  } catch {
    /* sem armazenamento */
  }
  return lista;
}
