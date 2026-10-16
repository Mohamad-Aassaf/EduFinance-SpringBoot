package com.edufinance.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Taxas reais usadas pelo Simulador para cada tipo de investimento.
 *
 * - Poupança, Tesouro Selic e CDB vêm da API pública do Banco Central (séries SGS, sem chave).
 * - Ações não têm taxa oficial: o backend busca na web a rentabilidade média do Ibovespa e
 *   pede ao Ollama para ler o número nos resultados. O número só é aceito se aparecer
 *   escrito nos próprios resultados e estiver numa faixa plausível, para o modelo não inventar.
 *
 * Tudo fica guardado por 12 horas. Se uma fonte falhar, vale a última taxa obtida ou,
 * na falta dela, uma estimativa fixa marcada como tal.
 */
@Service
public class TaxasService {

    public record Taxa(String tipo, double taxaAnual, String fonte, String detalhe, boolean estimativa) {
    }

    private static final long VALIDADE_MS = TimeUnit.HOURS.toMillis(12);
    // Depois de uma falha, tenta de novo bem antes das 12 horas
    private static final long NOVA_TENTATIVA_MS = TimeUnit.MINUTES.toMillis(30);
    private static final String SGS = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.%d/dados/ultimos/1?formato=json";
    private static final int SERIE_SELIC_META = 432;
    private static final int SERIE_CDI_ANUAL = 4389;
    private static final int SERIE_POUPANCA_MES = 195;

    // Estimativas usadas só quando a fonte nunca respondeu desde que o servidor subiu
    private static final Map<String, Taxa> PADRAO = Map.of(
            "Poupança", new Taxa("Poupança", 8.0, "Estimativa", "0,5% ao mês + TR", true),
            "Tesouro Selic", new Taxa("Tesouro Selic", 13.75, "Estimativa", "Taxa Selic", true),
            "CDB Bancário", new Taxa("CDB Bancário", 13.65, "Estimativa", "100% do CDI", true),
            "Ações da Bolsa", new Taxa("Ações da Bolsa", 10.0, "Estimativa", "Média histórica aproximada do Ibovespa", true));

    private static final List<String> ORDEM = List.of("Poupança", "Tesouro Selic", "CDB Bancário", "Ações da Bolsa");

    private final WebClient webClient;
    private final FinBotService finBotService;
    private final WebSearchService webSearchService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${finbot.taxas.model:${ollama.default.model:llama3.2:1b}}")
    private String modelo;

    private final Map<String, Taxa> taxas = new LinkedHashMap<>(PADRAO);
    private long bancoCentralEm = 0;
    private long acoesEm = 0;
    private final AtomicBoolean buscandoAcoes = new AtomicBoolean(false);

    public TaxasService(WebClient.Builder webClientBuilder, FinBotService finBotService, WebSearchService webSearchService) {
        this.webClient = webClientBuilder.build();
        this.finBotService = finBotService;
        this.webSearchService = webSearchService;
    }

    /** Taxas atuais na ordem do formulário; {@code atualizandoAcoes} indica que a busca do Ollama ainda roda. */
    public synchronized Map<String, Object> listar() {
        long agora = System.currentTimeMillis();
        if (agora - bancoCentralEm > VALIDADE_MS) {
            boolean ok = atualizarBancoCentral();
            bancoCentralEm = ok ? agora : agora - VALIDADE_MS + NOVA_TENTATIVA_MS;
        }
        if (agora - acoesEm > VALIDADE_MS && buscandoAcoes.compareAndSet(false, true)) {
            CompletableFuture.runAsync(this::atualizarAcoes);
        }

        List<Taxa> lista = new ArrayList<>();
        ORDEM.forEach(tipo -> lista.add(taxas.get(tipo)));
        Map<String, Object> resposta = new LinkedHashMap<>();
        resposta.put("taxas", lista);
        resposta.put("atualizandoAcoes", buscandoAcoes.get());
        return resposta;
    }

    // ─── Banco Central ───────────────────────────────────────────────────────

    /** Devolve true se as três séries responderam. */
    private boolean atualizarBancoCentral() {
        JsonNode selic = ultimoValor(SERIE_SELIC_META);
        if (selic != null) {
            taxas.put("Tesouro Selic", new Taxa("Tesouro Selic", arredondar(selic.path("valor").asDouble()),
                    "Banco Central", "Taxa Selic meta definida pelo Copom", false));
        }

        JsonNode cdi = ultimoValor(SERIE_CDI_ANUAL);
        if (cdi != null) {
            taxas.put("CDB Bancário", new Taxa("CDB Bancário", arredondar(cdi.path("valor").asDouble()),
                    "Banco Central", "CDB que rende 100% do CDI (CDI de " + cdi.path("data").asText() + ")", false));
        }

        // A série da poupança traz o rendimento de um mês; convertido para o ano com juros compostos
        JsonNode poupanca = ultimoValor(SERIE_POUPANCA_MES);
        if (poupanca != null) {
            double mensal = poupanca.path("valor").asDouble();
            double anual = (Math.pow(1 + mensal / 100, 12) - 1) * 100;
            taxas.put("Poupança", new Taxa("Poupança", arredondar(anual), "Banco Central",
                    String.format("%s%% no mês, levado para o ano", formatar(mensal, 4)), false));
        }
        return selic != null && cdi != null && poupanca != null;
    }

    private JsonNode ultimoValor(int serie) {
        try {
            String corpo = webClient.get()
                    .uri(String.format(SGS, serie))
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(8))
                    .block();
            JsonNode lista = objectMapper.readTree(corpo);
            JsonNode ultimo = lista.isArray() && !lista.isEmpty() ? lista.get(0) : null;
            return ultimo != null && ultimo.path("valor").asDouble() > 0 ? ultimo : null;
        } catch (Exception e) {
            System.err.println("Banco Central (série " + serie + ") indisponível: " + e.getMessage());
            return null;
        }
    }

    // ─── Ações: busca na web lida pelo Ollama ────────────────────────────────

    private void atualizarAcoes() {
        boolean ok = false;
        try {
            List<WebSearchService.Resultado> resultados =
                    webSearchService.buscar("Ibovespa rentabilidade média anual últimos 10 anos", 5);
            if (resultados.isEmpty()) {
                System.err.println("Taxa de ações: a busca na web não trouxe resultados; mantendo a estimativa.");
                return; // sem resultados o modelo só poderia inventar
            }

            StringBuilder texto = new StringBuilder();
            for (int i = 0; i < resultados.size(); i++) {
                texto.append("[").append(i + 1).append("] ").append(resultados.get(i).titulo()).append("\n")
                        .append(resultados.get(i).resumo()).append("\n\n");
            }
            Double taxa = perguntarAoOllama(texto.toString());

            // Só aceita um número plausível que esteja escrito nos resultados
            if (taxa != null && taxa > 0 && taxa <= 30 && aparecemNoTexto(taxa, texto.toString())) {
                synchronized (this) {
                    taxas.put("Ações da Bolsa", new Taxa("Ações da Bolsa", arredondar(taxa), "Busca na web lida pelo Ollama",
                            "Rentabilidade média anual do Ibovespa; ações não têm rendimento garantido", false));
                }
                ok = true;
            } else {
                System.err.println("Taxa de ações descartada (resposta do Ollama: " + taxa + ")");
            }
        } catch (Exception e) {
            System.err.println("Busca da taxa de ações falhou: " + e.getMessage());
        } finally {
            synchronized (this) {
                long agora = System.currentTimeMillis();
                acoesEm = ok ? agora : agora - VALIDADE_MS + NOVA_TENTATIVA_MS;
            }
            buscandoAcoes.set(false);
        }
    }

    private Double perguntarAoOllama(String resultados) throws Exception {
        String prompt = "Hoje é " + LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) + ". "
                + "Leia os resultados de busca abaixo e informe a rentabilidade média anual do Ibovespa, em % ao ano, "
                + "nos últimos anos. Use somente números que aparecem nos resultados. "
                + "Responda apenas com JSON no formato {\"taxa\": numero}, ou {\"taxa\": null} se o dado não aparecer.\n\n"
                + resultados;

        Map<String, Object> formato = Map.of(
                "type", "object",
                "properties", Map.of("taxa", Map.of("type", List.of("number", "null"))),
                "required", List.of("taxa"));
        Map<String, Object> corpo = Map.of(
                "model", modelo,
                "messages", List.of(Map.of("role", "user", "content", prompt)),
                "stream", false,
                "format", formato,
                "options", Map.of("temperature", 0));

        String resposta = webClient.post()
                .uri(finBotService.getOllamaApiUrl() + "/api/chat")
                .header("Content-Type", "application/json")
                .bodyValue(corpo)
                .retrieve()
                .bodyToMono(String.class)
                .timeout(Duration.ofMinutes(3))
                .block();

        String conteudo = objectMapper.readTree(resposta).path("message").path("content").asText();
        JsonNode taxa = objectMapper.readTree(conteudo).path("taxa");
        return taxa.isNumber() ? taxa.asDouble() : null;
    }

    /** O número precisa estar escrito nos resultados (com vírgula ou ponto decimal). */
    private static boolean aparecemNoTexto(double valor, String texto) {
        Matcher m = Pattern.compile("\\d+(?:[.,]\\d+)?").matcher(texto);
        while (m.find()) {
            if (Math.abs(Double.parseDouble(m.group().replace(',', '.')) - valor) < 0.005) {
                return true;
            }
        }
        return false;
    }

    private static double arredondar(double valor) {
        return Math.round(valor * 100.0) / 100.0;
    }

    private static String formatar(double valor, int casas) {
        return String.format(java.util.Locale.forLanguageTag("pt-BR"), "%." + casas + "f", valor);
    }
}
