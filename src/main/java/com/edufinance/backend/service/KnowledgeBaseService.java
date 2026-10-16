package com.edufinance.backend.service;

import com.edufinance.backend.model.Licao;
import com.edufinance.backend.repository.LicaoRepository;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.text.Normalizer;
import java.util.*;
import java.util.stream.Stream;

/**
 * Base de conhecimento do modo "fechado" do FinBot.
 *
 * Reúne as aulas da trilha (tabela licoes) e os arquivos .pdf, .txt e .md da
 * pasta configurada em finbot.knowledge.dir. O texto é dividido em trechos e a
 * busca é feita por palavras-chave (BM25), sem depender de modelo de embeddings.
 */
@Service
public class KnowledgeBaseService {

    /** Trecho devolvido pela busca, com o nome do documento de origem. */
    public record Trecho(String fonte, String texto) {
    }

    private record Chunk(String fonte, String texto, Map<String, Integer> termos, int tamanho) {
    }

    private static final int TAMANHO_TRECHO = 900;
    private static final Set<String> EXTENSOES = Set.of("pdf", "txt", "md");

    private static final Set<String> STOPWORDS = Set.of(
            "que", "qual", "quais", "como", "para", "por", "com", "sem", "uma", "uns", "umas", "dos", "das", "nos",
            "nas", "aos", "pelo", "pela", "pelos", "pelas", "num", "numa", "isso", "isto", "esse", "essa", "este",
            "esta", "aquele", "aquela", "ele", "ela", "eles", "elas", "meu", "minha", "meus", "minhas", "seu", "sua",
            "seus", "suas", "mais", "menos", "muito", "muita", "pouco", "tambem", "quando", "onde", "porque", "entre",
            "sobre", "ate", "mas", "nao", "sim", "ser", "sao", "foi", "era", "tem", "ter", "tenho", "estao",
            "estou", "fazer", "faz", "faco", "pode", "posso", "devo", "deve", "quero", "queria", "gostaria", "explique",
            "explica", "explicar", "fale", "falar", "diga", "dizer", "ola", "oi", "tudo", "bem", "bom", "boa", "dia",
            "tarde", "noite", "obrigado", "obrigada", "favor", "voce", "the", "and");

    @Value("${finbot.knowledge.dir:base-conhecimento}")
    private String knowledgeDir;

    private final LicaoRepository licaoRepository;

    private List<Chunk> indice = List.of();
    private Map<String, Integer> frequenciaDocumentos = Map.of();
    private double tamanhoMedio = 1;
    private String assinatura = null;

    public KnowledgeBaseService(LicaoRepository licaoRepository) {
        this.licaoRepository = licaoRepository;
    }

    /** Devolve os trechos mais relevantes para a pergunta (lista vazia se nada na base tratar do assunto). */
    public synchronized List<Trecho> buscar(String pergunta, int maximo) {
        atualizarIndice();

        Set<String> consulta = new LinkedHashSet<>(tokenizar(pergunta));
        if (consulta.isEmpty() || indice.isEmpty()) {
            return List.of();
        }

        Map<Chunk, Double> pontuacoes = new HashMap<>();
        for (Chunk chunk : indice) {
            double pontos = 0;
            for (String termo : consulta) {
                Integer tf = chunk.termos().get(termo);
                if (tf == null) {
                    continue;
                }
                int df = frequenciaDocumentos.getOrDefault(termo, 1);
                double idf = Math.log(1 + (indice.size() - df + 0.5) / (df + 0.5));
                pontos += idf * (tf * 2.2) / (tf + 1.2 * (0.25 + 0.75 * chunk.tamanho() / tamanhoMedio));
            }
            if (pontos > 0) {
                pontuacoes.put(chunk, pontos);
            }
        }

        double melhor = pontuacoes.values().stream().mapToDouble(Double::doubleValue).max().orElse(0);
        return pontuacoes.entrySet().stream()
                // descarta trechos que só esbarram na pergunta por uma palavra pouco relevante
                .filter(e -> e.getValue() >= melhor * 0.4)
                .sorted(Map.Entry.<Chunk, Double>comparingByValue().reversed())
                .limit(maximo)
                .map(e -> new Trecho(e.getKey().fonte(), e.getKey().texto()))
                .toList();
    }

    /** Lista os documentos indexados, para a tela mostrar o que compõe a base. */
    public synchronized List<Map<String, Object>> listarFontes() {
        atualizarIndice();
        Map<String, Integer> trechosPorFonte = new LinkedHashMap<>();
        for (Chunk chunk : indice) {
            trechosPorFonte.merge(chunk.fonte(), 1, Integer::sum);
        }
        List<Map<String, Object>> fontes = new ArrayList<>();
        trechosPorFonte.forEach((nome, trechos) -> fontes.add(Map.of("nome", nome, "trechos", trechos)));
        return fontes;
    }

    // ----------------------------------------------------------------
    // Indexação
    // ----------------------------------------------------------------

    /** Refaz o índice quando uma aula ou um arquivo da pasta muda. */
    private void atualizarIndice() {
        List<Path> arquivos = listarArquivos();
        List<Licao> licoes = licaoRepository.findAll();

        StringBuilder atual = new StringBuilder();
        for (Licao licao : licoes) {
            atual.append(licao.getId()).append(':').append(Objects.hash(licao.getTitulo(), licao.getConteudo(),
                    licao.getExemplo())).append(';');
        }
        for (Path arquivo : arquivos) {
            atual.append(arquivo).append(':').append(arquivo.toFile().lastModified()).append(':')
                    .append(arquivo.toFile().length()).append(';');
        }
        if (atual.toString().equals(assinatura)) {
            return;
        }

        List<Chunk> novoIndice = new ArrayList<>();
        for (Licao licao : licoes) {
            String texto = licao.getTitulo() + ". " + licao.getConteudo()
                    + (licao.getExemplo() != null ? "\n\nExemplo: " + licao.getExemplo() : "");
            adicionar(novoIndice, "Aula: " + licao.getTitulo(), texto);
        }
        for (Path arquivo : arquivos) {
            try {
                adicionar(novoIndice, arquivo.getFileName().toString(), lerArquivo(arquivo));
            } catch (Exception e) {
                System.err.println("Base de conhecimento: não foi possível ler " + arquivo + " — " + e.getMessage());
            }
        }

        Map<String, Integer> df = new HashMap<>();
        long total = 0;
        for (Chunk chunk : novoIndice) {
            chunk.termos().keySet().forEach(termo -> df.merge(termo, 1, Integer::sum));
            total += chunk.tamanho();
        }

        this.indice = novoIndice;
        this.frequenciaDocumentos = df;
        this.tamanhoMedio = novoIndice.isEmpty() ? 1 : Math.max(1, (double) total / novoIndice.size());
        this.assinatura = atual.toString();
    }

    private List<Path> listarArquivos() {
        Path pasta = Path.of(knowledgeDir);
        if (!Files.isDirectory(pasta)) {
            return List.of();
        }
        try (Stream<Path> caminhos = Files.walk(pasta)) {
            return caminhos.filter(Files::isRegularFile)
                    .filter(p -> EXTENSOES.contains(extensao(p)))
                    .sorted()
                    .toList();
        } catch (IOException e) {
            return List.of();
        }
    }

    private static String extensao(Path arquivo) {
        String nome = arquivo.getFileName().toString().toLowerCase();
        int ponto = nome.lastIndexOf('.');
        return ponto < 0 ? "" : nome.substring(ponto + 1);
    }

    private static String lerArquivo(Path arquivo) throws IOException {
        if ("pdf".equals(extensao(arquivo))) {
            try (PDDocument documento = Loader.loadPDF(arquivo.toFile())) {
                return new PDFTextStripper().getText(documento);
            }
        }
        return Files.readString(arquivo, StandardCharsets.UTF_8);
    }

    private static void adicionar(List<Chunk> indice, String fonte, String texto) {
        // Cada título de markdown abre um trecho novo, para não misturar assuntos diferentes
        for (String secao : texto.split("(?m)^(?=#{1,6} )")) {
            adicionarSecao(indice, fonte, secao);
        }
    }

    private static void adicionarSecao(List<Chunk> indice, String fonte, String texto) {
        for (String parte : dividir(texto)) {
            Map<String, Integer> termos = new HashMap<>();
            List<String> tokens = tokenizar(parte);
            tokens.forEach(t -> termos.merge(t, 1, Integer::sum));
            if (!termos.isEmpty()) {
                indice.add(new Chunk(fonte, parte, termos, tokens.size()));
            }
        }
    }

    /** Quebra o texto em trechos de até ~900 caracteres, respeitando parágrafos e frases. */
    private static List<String> dividir(String texto) {
        List<String> partes = new ArrayList<>();
        StringBuilder atual = new StringBuilder();
        for (String frase : texto.replace("\r", "").split("\\n\\s*\\n|(?<=[.!?])\\s+")) {
            frase = frase.replaceAll("\\s+", " ").trim();
            while (frase.length() > TAMANHO_TRECHO) {
                partes.add(frase.substring(0, TAMANHO_TRECHO));
                frase = frase.substring(TAMANHO_TRECHO);
            }
            if (frase.isEmpty()) {
                continue;
            }
            if (atual.length() + frase.length() > TAMANHO_TRECHO && atual.length() > 0) {
                partes.add(atual.toString());
                atual.setLength(0);
            }
            atual.append(atual.length() > 0 ? " " : "").append(frase);
        }
        if (atual.length() > 0) {
            partes.add(atual.toString());
        }
        return partes;
    }

    /** Minúsculas, sem acento, sem palavras vazias e com o plural reduzido ao singular. */
    private static List<String> tokenizar(String texto) {
        String limpo = Normalizer.normalize(texto.toLowerCase(), Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        List<String> tokens = new ArrayList<>();
        for (String palavra : limpo.split("[^a-z0-9]+")) {
            if (palavra.length() < 3 || STOPWORDS.contains(palavra)) {
                continue;
            }
            tokens.add(singular(palavra));
        }
        return tokens;
    }

    private static String singular(String palavra) {
        if (palavra.length() < 5) {
            return palavra;
        }
        if (palavra.endsWith("oes")) {
            return palavra.substring(0, palavra.length() - 3) + "ao";
        }
        if (palavra.endsWith("ais")) {
            return palavra.substring(0, palavra.length() - 2) + "l";
        }
        if (palavra.endsWith("ns")) {
            return palavra.substring(0, palavra.length() - 2) + "m";
        }
        if (palavra.endsWith("s")) {
            return palavra.substring(0, palavra.length() - 1);
        }
        return palavra;
    }
}
