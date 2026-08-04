package com.edufinance.backend.service;

import com.edufinance.backend.model.ChatMessage;
import com.edufinance.backend.model.ChatSession;
import com.edufinance.backend.repository.ChatMessageRepository;
import com.edufinance.backend.repository.ChatSessionRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class FinBotService {

    @Value("${ollama.api.url:http://100.83.132.45:11434}")
    private String ollamaApiUrl;

    @Value("${ollama.default.model:llama3.2:1b}")
    private String defaultModel;

    // Admin Host Config (PC vs Notebook vs Custom)
    private String activeHostMode = "pc"; // "pc", "notebook", "custom"
    private String pcUrl = "http://100.83.132.45:11434";
    private String notebookUrl = "http://localhost:11434";
    private String customUrl = "http://localhost:11434";

    public String getOllamaApiUrl() {
        if ("pc".equalsIgnoreCase(activeHostMode)) {
            return pcUrl;
        } else if ("custom".equalsIgnoreCase(activeHostMode)) {
            return customUrl;
        } else {
            return (notebookUrl != null && !notebookUrl.isBlank()) ? notebookUrl : ollamaApiUrl;
        }
    }

    public Map<String, Object> getConfig() {
        Map<String, Object> config = new LinkedHashMap<>();
        config.put("activeHostMode", activeHostMode);
        config.put("currentUrl", getOllamaApiUrl());
        config.put("pcUrl", pcUrl);
        config.put("notebookUrl", notebookUrl);
        config.put("customUrl", customUrl);
        return config;
    }

    public Map<String, Object> updateConfig(Map<String, String> request) {
        if (request.containsKey("activeHostMode")) {
            this.activeHostMode = request.get("activeHostMode");
        }
        if (request.containsKey("pcUrl") && request.get("pcUrl") != null && !request.get("pcUrl").isBlank()) {
            this.pcUrl = request.get("pcUrl");
        }
        if (request.containsKey("notebookUrl") && request.get("notebookUrl") != null && !request.get("notebookUrl").isBlank()) {
            this.notebookUrl = request.get("notebookUrl");
        }
        if (request.containsKey("customUrl") && request.get("customUrl") != null && !request.get("customUrl").isBlank()) {
            this.customUrl = request.get("customUrl");
        }
        return getConfig();
    }

    public Map<String, Object> checkStatus() {
        String targetUrl = getOllamaApiUrl();
        boolean online = false;
        String message = "";
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = webClient.get()
                    .uri(targetUrl + "/api/tags")
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(Duration.ofSeconds(3))
                    .block();
            online = response != null;
            message = online ? "Ollama conectado com sucesso!" : "Ollama não respondeu.";
        } catch (Exception e) {
            message = "Servidor " + activeHostMode.toUpperCase() + " em " + targetUrl + " indisponível.";
        }
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("online", online);
        res.put("url", targetUrl);
        res.put("hostMode", activeHostMode);
        res.put("message", message);
        return res;
    }

    private final WebClient webClient;
    private final ChatSessionRepository sessionRepository;
    private final ChatMessageRepository messageRepository;

    // Available models metadata
    public static final List<Map<String, Object>> AVAILABLE_MODELS = List.of(
            Map.of("id", "llama3.2:1b", "name", "Llama 3.2 1B", "size", "1.3 GB", "description",
                    "Mais rápido — ideal para testes", "badge", "⚡ Rápido"),
            Map.of("id", "mistral:7b", "name", "Mistral 7B", "size", "4.4 GB", "description",
                    "Melhor qualidade em PT-BR", "badge", "🌟 Recomendado"),
            Map.of("id", "gemma4:12b", "name", "Gemma 4 12B", "size", "7.6 GB", "description",
                    "Modelo Google, máxima qualidade", "badge", "🔬 Avançado"));

    // System prompt for financial education context
    private static final String SYSTEM_PROMPT = "Você é o Professor FinBot, um assistente especializado em educação financeira para brasileiros. "
            +
            "Responda SEMPRE em português do Brasil, de forma didática, clara e amigável. " +
            "Foque em investimentos, mercado financeiro, planejamento financeiro pessoal, taxa Selic, " +
            "renda fixa, renda variável, ações, FIIs, Tesouro Direto, CDB, LCI, LCA, " +
            "diversificação de carteira, juros compostos e reserva de emergência. " +
            "Seja encorajador e educativo. Use exemplos práticos com valores em Reais (R$). " +
            "Formate suas respostas com markdown quando útil (negrito, listas, etc).";

    public FinBotService(WebClient.Builder webClientBuilder,
            ChatSessionRepository sessionRepository,
            ChatMessageRepository messageRepository) {
        this.webClient = webClientBuilder
                .codecs(c -> c.defaultCodecs().maxInMemorySize(8 * 1024 * 1024))
                .build();
        this.sessionRepository = sessionRepository;
        this.messageRepository = messageRepository;
    }

    /**
     * Send a message to Ollama and persist the conversation.
     * 
     * @param userId    the authenticated user ID
     * @param sessionId existing session ID (null = create new)
     * @param model     Ollama model ID
     * @param userText  the user's message text
     * @return map with sessionId and botReply
     */
    public Map<String, Object> chat(Long userId, Long sessionId, String model, String userText) {
        String selectedModel = (model != null && !model.isBlank()) ? model : defaultModel;

        // Resolve or create session
        ChatSession session;
        if (sessionId != null) {
            session = sessionRepository.findById(sessionId)
                    .orElseThrow(() -> new RuntimeException("Sessão não encontrada: " + sessionId));
        } else {
            session = new ChatSession();
            session.setUserId(userId);
            session.setModel(selectedModel);
            // Title = first 60 chars of user message
            String title = userText.length() > 60 ? userText.substring(0, 57) + "..." : userText;
            session.setTitle(title);
            session.setCreatedAt(LocalDateTime.now());
            session.setUpdatedAt(LocalDateTime.now());
            session = sessionRepository.save(session);
        }

        // Persist user message
        ChatMessage userMsg = new ChatMessage(session, "user", userText);
        messageRepository.save(userMsg);

        // Load full history for context
        List<ChatMessage> history = messageRepository.findBySessionIdOrderByCreatedAtAsc(session.getId());

        // Build Ollama messages array with system prompt first
        List<Map<String, String>> ollamaMessages = new ArrayList<>();
        ollamaMessages.add(Map.of("role", "system", "content", SYSTEM_PROMPT));
        for (ChatMessage m : history) {
            ollamaMessages.add(Map.of("role", m.getRole(), "content", m.getContent()));
        }

        // Call Ollama
        String botReply;
        try {
            Map<String, Object> requestBody = Map.of(
                    "model", selectedModel,
                    "messages", ollamaMessages,
                    "stream", false);

            @SuppressWarnings("unchecked")
            Map<String, Object> response = webClient.post()
                    .uri(getOllamaApiUrl() + "/api/chat")
                    .header("Content-Type", "application/json")
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(Duration.ofMinutes(5))
                    .block();

            if (response != null && response.containsKey("message")) {
                @SuppressWarnings("unchecked")
                Map<String, Object> msgMap = (Map<String, Object>) response.get("message");
                botReply = (String) msgMap.getOrDefault("content", "Sem resposta do modelo.");
            } else {
                botReply = "O modelo não retornou uma resposta válida.";
            }
        } catch (WebClientResponseException e) {
            botReply = "Erro na API Ollama [" + e.getStatusCode() + "]: " + e.getResponseBodyAsString();
        } catch (Exception e) {
            botReply = "❌ Falha ao conectar ao Ollama. Verifique se o Ollama está rodando (`ollama serve`). Erro: "
                    + e.getMessage();
        }

        // Persist bot reply
        ChatMessage botMsg = new ChatMessage(session, "assistant", botReply);
        messageRepository.save(botMsg);

        // Update session timestamp
        session.setUpdatedAt(LocalDateTime.now());
        sessionRepository.save(session);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("sessionId", session.getId());
        result.put("sessionTitle", session.getTitle());
        result.put("model", selectedModel);
        result.put("reply", botReply);
        return result;
    }

    public List<ChatSession> getSessionsForUser(Long userId) {
        return sessionRepository.findByUserIdOrderByUpdatedAtDesc(userId);
    }

    public List<ChatMessage> getMessagesForSession(Long sessionId) {
        return messageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);
    }

    public void deleteSession(Long sessionId) {
        sessionRepository.deleteById(sessionId);
    }

    public List<Map<String, Object>> getAvailableModels() {
        return AVAILABLE_MODELS;
    }
}
