/**
 * Criptografia da chave digital (só funções puras, sem React nem rede).
 *
 * - Assinaturas: Ed25519 (@noble/curves). A chave privada é uma "semente" de 32 bytes.
 * - 12 palavras de recuperação: 16 bytes aleatórios viram 12 palavras (BIP39, lista em português);
 *   a semente é o SHA-256 desses bytes. Quem tem as palavras recria exatamente a mesma chave.
 * - Arquivo da chave (o que vai para o pendrive): a semente cifrada com AES-256-GCM, usando uma
 *   chave derivada da senha com scrypt. Sem a senha, o arquivo não serve para nada.
 *
 * Usamos bibliotecas em JavaScript puro em vez da Web Crypto do navegador porque o EduFinance
 * também é aberto pela rede local (http://IP), e nesse caso o navegador desliga a Web Crypto.
 */

import { ed25519 } from "@noble/curves/ed25519.js";
import { scryptAsync } from "@noble/hashes/scrypt.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { randomBytes, utf8ToBytes, concatBytes, bytesToHex } from "@noble/hashes/utils.js";
import { gcm } from "@noble/ciphers/aes.js";
import { entropyToMnemonic, mnemonicToEntropy, validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/portuguese.js";

export const FORMATO_ARQUIVO = "edufinance-chave";
const DOMINIO_SEMENTE = utf8ToBytes("EduFinance chave v1");
// scrypt: ~0,3 s num computador comum; deixa adivinhar a senha do arquivo muito caro
const SCRYPT = { N: 2 ** 15, r: 8, p: 1, dkLen: 32 };

// ── Base64 ────────────────────────────────────────────────────────────────
export function paraBase64(bytes) {
  let texto = "";
  for (const b of bytes) texto += String.fromCharCode(b);
  return btoa(texto);
}

export function deBase64(texto) {
  const bin = atob(texto);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// ── Chaves ────────────────────────────────────────────────────────────────

/** Cria uma chave nova e as 12 palavras que a recuperam. */
export function gerarChave() {
  const entropia = randomBytes(16);
  const frase = entropyToMnemonic(entropia, wordlist);
  return { frase, ...chaveDaEntropia(entropia) };
}

function chaveDaEntropia(entropia) {
  const semente = sha256(concatBytes(DOMINIO_SEMENTE, entropia));
  return { semente, chavePublica: paraBase64(ed25519.getPublicKey(semente)) };
}

/** Normaliza o que a pessoa digitou: minúsculas, sem acentos, espaços simples. */
export function normalizarFrase(frase) {
  return frase
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .join(" ");
}

/** Recria a chave a partir das 12 palavras. Lança erro se as palavras não formam uma frase válida. */
export function chaveDaFrase(frase) {
  const normalizada = normalizarFrase(frase);
  if (normalizada.split(" ").length !== 12 || !validateMnemonic(normalizada, wordlist)) {
    throw new Error("Essas 12 palavras não formam uma frase de recuperação válida. Confira a ordem e a grafia.");
  }
  return chaveDaEntropia(mnemonicToEntropy(normalizada, wordlist));
}

/** Impressão digital curta da chave pública, para a pessoa comparar a olho (ex.: "3F2A 9C10 7B44 E01D"). */
export function impressaoDigital(chavePublica) {
  const hex = bytesToHex(sha256(utf8ToBytes(chavePublica))).slice(0, 16).toUpperCase();
  return hex.match(/.{4}/g).join(" ");
}

// ── Assinatura ────────────────────────────────────────────────────────────

export function assinarTexto(texto, semente) {
  return paraBase64(ed25519.sign(utf8ToBytes(texto), semente));
}

export function assinaturaConfere(texto, assinatura, chavePublica) {
  try {
    return ed25519.verify(deBase64(assinatura), utf8ToBytes(texto), deBase64(chavePublica));
  } catch {
    return false;
  }
}

// ── Arquivo da chave ──────────────────────────────────────────────────────

/**
 * Monta o arquivo da chave (objeto JSON) com a semente cifrada pela senha.
 * dono: { tipo: "usuario" | "admin", usuarioId, nome, email }
 */
export async function criarArquivo(semente, chavePublica, senha, dono) {
  const sal = randomBytes(16);
  const iv = randomBytes(12);
  const chaveCifra = await scryptAsync(utf8ToBytes(senha), sal, SCRYPT);
  // A chave pública entra como "dado associado": trocar a chave pública do arquivo invalida a cifra
  const cifrado = gcm(chaveCifra, iv, utf8ToBytes(chavePublica)).encrypt(semente);
  return {
    formato: FORMATO_ARQUIVO,
    versao: 1,
    algoritmo: "Ed25519",
    tipo: dono.tipo,
    usuarioId: dono.usuarioId ?? null,
    nome: dono.nome ?? null,
    email: dono.email ?? null,
    chavePublica,
    kdf: { nome: "scrypt", N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p, sal: paraBase64(sal) },
    cifra: { nome: "AES-256-GCM", iv: paraBase64(iv), dados: paraBase64(cifrado) },
    criadoEm: new Date().toISOString(),
  };
}

/** Lê e valida a estrutura do arquivo (texto JSON). Não precisa da senha. */
export function lerArquivo(texto) {
  let arquivo;
  try {
    arquivo = typeof texto === "string" ? JSON.parse(texto) : texto;
  } catch {
    throw new Error("Esse arquivo não é uma chave do EduFinance.");
  }
  if (arquivo?.formato !== FORMATO_ARQUIVO || arquivo.versao !== 1 || !arquivo.chavePublica || !arquivo.cifra) {
    throw new Error("Esse arquivo não é uma chave do EduFinance.");
  }
  return arquivo;
}

/** Abre o arquivo com a senha e devolve a semente. Lança erro se a senha estiver errada. */
export async function abrirArquivo(arquivo, senha) {
  const { kdf, cifra, chavePublica } = arquivo;
  const chaveCifra = await scryptAsync(utf8ToBytes(senha), deBase64(kdf.sal), {
    N: kdf.N,
    r: kdf.r,
    p: kdf.p,
    dkLen: 32,
  });
  let semente;
  try {
    semente = gcm(chaveCifra, deBase64(cifra.iv), utf8ToBytes(chavePublica)).decrypt(deBase64(cifra.dados));
  } catch {
    throw new Error("Senha da chave incorreta.");
  }
  if (paraBase64(ed25519.getPublicKey(semente)) !== chavePublica) {
    throw new Error("O arquivo da chave está corrompido.");
  }
  return semente;
}
