package com.edufinance.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Pergunta introdutória das Boas-Vindas: "O que é educação financeira?".
 *
 * O Ollama compara a resposta do usuário com uma resposta de referência e devolve
 * uma nota de 0 a 10 com um feedback no tom do Professor FinBot. Nos testes, o
 * mistral:7b avaliou bem melhor que o llama3.2:1b (que dava nota 4 para "asdfgh"),
 * por isso ele é tentado primeiro; se não estiver instalado no servidor, vale o modelo padrão.
 * Se a IA estiver fora do ar, a pessoa recebe a resposta de referência e segue em frente.
 */
@Service
public class BoasVindasService {

    public static final String PERGUNTA = "O que é educação financeira?";

    public static final String RESPOSTA_REFERENCIA = "Educação financeira é o conjunto de conhecimentos e hábitos que "
            + "ajudam a pessoa a cuidar bem do próprio dinheiro: saber quanto ganha e quanto gasta, montar um orçamento, "
            + "poupar, evitar dívidas caras, ter uma reserva de emergência, planejar objetivos e investir com consciência, "
            + "para tomar decisões melhores e ter mais segurança hoje e no futuro.";

    private static final String INSTRUCOES = "Você é o Professor FinBot, tutor de educação financeira da plataforma "
            + "EduFinance. Fale em português do Brasil, de forma acolhedora e direta, tratando o aluno por 'você'. "
            + "Você avalia a resposta de um aluno novo comparando com a resposta de referência. A nota vai de 0 a 10 e "
            + "mede o quanto a resposta cobre as ideias principais da referência (cuidar do dinheiro, orçamento e "
            + "controle de gastos, poupar e reserva de emergência, evitar dívidas, planejar e investir). Não exija as "
            + "mesmas palavras. Respostas vazias, sem sentido ou fora do assunto valem de 0 a 2.";

    private final WebClient webClient;
    private final FinBotService finBotService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${finbot.boasvindas.model:mistral:7b}")
    private String modeloPreferido;

    @Value("${ollama.default.model:llama3.2:1b}")
    private String modeloPadrao;

    public BoasVindasService(WebClient.Builder webClientBuilder, FinBotService finBotService) {
        this.webClient = webClientBuilder.build();
        this.finBotService = finBotService;
    }

    /** Devolve nota, acertos, faltou, feedback, respostaReferencia e avaliadoPorIa. */
    public Map<String, Object> avaliar(String resposta) {
        Map<String, Object> resultado = new LinkedHashMap<>();
        resultado.put("respostaReferencia", RESPOSTA_REFERENCIA);

        Set<String> modelos = new LinkedHashSet<>(List.of(modeloPreferido, modeloPadrao));
        for (String modelo : modelos) {
            try {
                JsonNode avaliacao = perguntarAoOllama(modelo, resposta);
                int nota = Math.max(0, Math.min(10, avaliacao.path("nota").asInt()));
                resultado.put("nota", nota);
                resultado.put("acertos", avaliacao.path("acertos").asText(""));
                resultado.put("faltou", avaliacao.path("faltou").asText(""));
                resultado.put("feedback", avaliacao.path("feedback").asText(""));
                resultado.put("avaliadoPorIa", true);
                return resultado;
            } catch (Exception e) {
                System.err.println("Boas-Vindas: avaliação com " + modelo + " falhou: " + e.getMessage());
            }
        }

        resultado.put("nota", null);
        resultado.put("acertos", "");
        resultado.put("faltou", "");
        resultado.put("feedback", "Não consegui falar com a IA agora, então não dei nota para a sua resposta. "
                + "Compare o que você escreveu com a resposta abaixo: é exatamente isso que vamos praticar juntos por aqui!");
        resultado.put("avaliadoPorIa", false);
        return resultado;
    }

    private JsonNode perguntarAoOllama(String modelo, String resposta) throws Exception {
        String pedido = "Pergunta: " + PERGUNTA + "\n\n"
                + "Resposta de referência: " + RESPOSTA_REFERENCIA + "\n\n"
                + "Resposta do aluno: \"" + resposta.replace("\"", "'") + "\"\n\n"
                + "Responda em JSON com: nota (inteiro de 0 a 10), acertos (o que o aluno acertou, 1 frase; vazio se nada), "
                + "faltou (o que faltou ou ficou impreciso, 1 frase) e feedback (no máximo 3 frases curtas e "
                + "encorajadoras, falando direto com o aluno).";

        Map<String, Object> formato = Map.of(
                "type", "object",
                "properties", Map.of(
                        "nota", Map.of("type", "integer"),
                        "acertos", Map.of("type", "string"),
                        "faltou", Map.of("type", "string"),
                        "feedback", Map.of("type", "string")),
                "required", List.of("nota", "acertos", "faltou", "feedback"));

        List<Map<String, String>> mensagens = new ArrayList<>();
        mensagens.add(Map.of("role", "system", "content", INSTRUCOES));
        mensagens.add(Map.of("role", "user", "content", pedido));

        Map<String, Object> corpo = Map.of(
                "model", modelo,
                "messages", mensagens,
                "stream", false,
                "format", formato,
                "options", Map.of("temperature", 0.2));

        String respostaOllama = webClient.post()
                .uri(finBotService.getOllamaApiUrl() + "/api/chat")
                .header("Content-Type", "application/json")
                .bodyValue(corpo)
                .retrieve()
                .bodyToMono(String.class)
                .timeout(Duration.ofMinutes(3))
                .block();

        String conteudo = objectMapper.readTree(respostaOllama).path("message").path("content").asText();
        JsonNode avaliacao = objectMapper.readTree(conteudo);
        if (!avaliacao.path("nota").isNumber() || avaliacao.path("feedback").asText("").isBlank()) {
            throw new IllegalStateException("resposta fora do formato: " + conteudo);
        }
        return avaliacao;
    }
}
