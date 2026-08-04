package com.teste.geminitester.service;

import com.teste.geminitester.model.OllamaRequest;
import com.teste.geminitester.model.OllamaRequest.Message;
import com.teste.geminitester.model.OllamaResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.Duration;
import java.util.List;
import java.util.Map;

@Service
public class GeminiService {

    @Value("${ollama.api.url}")
    private String apiUrl;

    @Value("${ollama.model}")
    private String defaultModel;

    // Modelos disponíveis com seus limites de contexto e tamanhos
    public static final List<Map<String, Object>> AVAILABLE_MODELS = List.of(
        Map.of("id", "mistral:7b",    "name", "Mistral 7B",   "contextWindow", 32768,   "size", "4.1 GB", "description", "Melhor qualidade de texto em PT-BR"),
        Map.of("id", "gemma4:12b",    "name", "Gemma 4 12B",  "contextWindow", 8192,    "size", "7.6 GB", "description", "Modelo do Google, boa capacidade geral"),
        Map.of("id", "llama3.2:3b",   "name", "Llama 3.2 3B", "contextWindow", 131072,  "size", "2.0 GB", "description", "Mais rápido, contexto enorme (128k)")
    );

    private final WebClient webClient;

    public GeminiService(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder
                .codecs(c -> c.defaultCodecs().maxInMemorySize(4 * 1024 * 1024))
                .build();
    }

    /**
     * Envia mensagem com histórico de conversa completo.
     *
     * @param model    ID do modelo Ollama (ex: "mistral:7b")
     * @param messages Histórico completo incluindo a mensagem atual
     */
    public OllamaResponse sendMessage(String model, List<Message> messages) {
        String selectedModel = (model != null && !model.isBlank()) ? model : defaultModel;

        OllamaRequest request = new OllamaRequest();
        request.setModel(selectedModel);
        request.setStream(false);
        request.setMessages(messages);

        try {
            return webClient.post()
                    .uri(apiUrl)
                    .header("Content-Type", "application/json")
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(OllamaResponse.class)
                    .timeout(Duration.ofMinutes(5))
                    .block();
        } catch (WebClientResponseException e) {
            throw new RuntimeException(
                    "Erro na API Ollama [" + e.getStatusCode() + "]: " + e.getResponseBodyAsString(), e);
        } catch (Exception e) {
            throw new RuntimeException("Falha ao conectar ao Ollama: " + e.getMessage(), e);
        }
    }

    public String extractText(OllamaResponse response) {
        if (response == null || response.getMessage() == null) return "Nenhuma resposta recebida.";
        String content = response.getMessage().getContent();
        return (content != null && !content.isBlank()) ? content : "Resposta vazia.";
    }

    public String getDefaultModel() { return defaultModel; }
}
