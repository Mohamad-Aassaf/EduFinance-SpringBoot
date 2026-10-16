package com.edufinance.backend.service;

import com.edufinance.backend.model.ChatMessage;
import com.edufinance.backend.model.ChatSession;
import com.edufinance.backend.repository.ChatMessageRepository;
import com.edufinance.backend.model.ConfiguracaoSistema;
import com.edufinance.backend.repository.ChatSessionRepository;
import com.edufinance.backend.repository.ConfiguracaoSistemaRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.http.HttpStatus;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kwabenaberko.newsapilib.models.Article;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
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
    @Value("${ollama.notebook.url:http://localhost:11434}")
    private String notebookUrl;
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

    // Senha do painel de administração da IA (troque em application.properties ou FINBOT_ADMIN_PASSWORD)
    @Value("${finbot.admin.password:edufinance}")
    private String adminPassword;

    private static final Set<String> HOST_MODES = Set.of("pc", "notebook", "custom");

    /** O servidor escolhido pelo admin vale para todos os usuários e é relido do banco ao iniciar. */
    @PostConstruct
    void carregarConfig() {
        try {
            Map<String, String> salvas = new HashMap<>();
            configRepository.findAll().forEach(c -> salvas.put(c.getChave(), c.getValor()));
            String modo = salvas.get("finbot.hostMode");
            if (modo != null && HOST_MODES.contains(modo)) {
                activeHostMode = modo;
            }
            pcUrl = salvas.getOrDefault("finbot.pcUrl", pcUrl);
            notebookUrl = salvas.getOrDefault("finbot.notebookUrl", notebookUrl);
            customUrl = salvas.getOrDefault("finbot.customUrl", customUrl);
        } catch (Exception e) {
            System.err.println("Configuração da IA: usando os valores padrão (" + e.getMessage() + ")");
        }
    }

    public void exigirAdmin(String senha) {
        boolean confere = senha != null && MessageDigest.isEqual(
                senha.getBytes(StandardCharsets.UTF_8), adminPassword.getBytes(StandardCharsets.UTF_8));
        if (!confere) {
            throw new RegraNegocioException(HttpStatus.FORBIDDEN, "Senha de administrador incorreta.");
        }
    }

    /** O que qualquer usuário pode ver: só qual servidor está ativo. */
    public Map<String, Object> getPublicConfig() {
        return Map.of("activeHostMode", activeHostMode);
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
        String modo = request.get("activeHostMode");
        if (modo != null) {
            if (!HOST_MODES.contains(modo)) {
                throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "Servidor de IA inválido.");
            }
            this.activeHostMode = modo;
        }
        this.pcUrl = urlOuAtual(request.get("pcUrl"), pcUrl);
        this.notebookUrl = urlOuAtual(request.get("notebookUrl"), notebookUrl);
        this.customUrl = urlOuAtual(request.get("customUrl"), customUrl);

        configRepository.save(new ConfiguracaoSistema("finbot.hostMode", activeHostMode));
        configRepository.save(new ConfiguracaoSistema("finbot.pcUrl", pcUrl));
        configRepository.save(new ConfiguracaoSistema("finbot.notebookUrl", notebookUrl));
        configRepository.save(new ConfiguracaoSistema("finbot.customUrl", customUrl));
        return getConfig();
    }

    private static String urlOuAtual(String nova, String atual) {
        if (nova == null || nova.isBlank()) {
            return atual;
        }
        String url = nova.trim().replaceAll("/+$", "");
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "O endereço do servidor deve começar com http:// ou https://.");
        }
        return url;
    }

    public Map<String, Object> checkStatus() {
        return testarServidor(getOllamaApiUrl(), activeHostMode);
    }

    /** Testa um endereço sem alterar a configuração em uso. */
    public Map<String, Object> testarServidor(String targetUrl, String rotulo) {
        targetUrl = urlOuAtual(targetUrl, getOllamaApiUrl());
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
            message = "Servidor " + rotulo.toUpperCase() + " em " + targetUrl + " indisponível.";
        }
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("online", online);
        res.put("url", targetUrl);
        res.put("hostMode", rotulo);
        res.put("message", message);
        return res;
    }

    private final WebClient webClient;
    private final ChatSessionRepository sessionRepository;
    private final ChatMessageRepository messageRepository;
    private final ConfiguracaoSistemaRepository configRepository;
    private final KnowledgeBaseService knowledgeBaseService;
    private final WebSearchService webSearchService;
    private final NewsService newsService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // Knowledge modes: where the bot looks for information before answering
    public static final String MODE_CLOSED = "closed"; // only the platform's own knowledge base
    public static final String MODE_OPEN = "open"; // web search

    /** Extra context gathered for one question, plus the sources shown to the user. */
    private record Contexto(String texto, List<Map<String, String>> fontes) {
    }

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
            ChatMessageRepository messageRepository,
            ConfiguracaoSistemaRepository configRepository,
            KnowledgeBaseService knowledgeBaseService,
            WebSearchService webSearchService,
            NewsService newsService) {
        this.webClient = webClientBuilder
                .codecs(c -> c.defaultCodecs().maxInMemorySize(8 * 1024 * 1024))
                .build();
        this.sessionRepository = sessionRepository;
        this.messageRepository = messageRepository;
        this.configRepository = configRepository;
        this.knowledgeBaseService = knowledgeBaseService;
        this.webSearchService = webSearchService;
        this.newsService = newsService;
    }

    /**
     * Send a message to Ollama and persist the conversation.
     * 
     * @param userId    the authenticated user ID
     * @param sessionId existing session ID (null = create new)
     * @param model     Ollama model ID
     * @param userText  the user's message text
     * @param mode      "closed" (own knowledge base), "open" (web search) or null (model only)
     * @return map with sessionId and botReply
     */
    public Map<String, Object> chat(Long userId, Long sessionId, String model, String userText, String mode) {
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

        // Gather the context for the chosen mode (knowledge base or web)
        Contexto contexto = MODE_CLOSED.equals(mode) ? buscarNaBase(userText)
                : MODE_OPEN.equals(mode) ? buscarNaWeb(userText)
                : new Contexto("", List.of());
        List<Map<String, String>> fontes = contexto.fontes();

        // Build Ollama messages array with system prompt first
        List<Map<String, String>> ollamaMessages = new ArrayList<>();
        ollamaMessages.add(Map.of("role", "system", "content", SYSTEM_PROMPT));
        for (ChatMessage m : history) {
            ollamaMessages.add(Map.of("role", m.getRole(), "content", m.getContent()));
        }
        // The context goes inside the last user message (not persisted): small models follow it better there
        if (!fontes.isEmpty()) {
            ollamaMessages.set(ollamaMessages.size() - 1,
                    Map.of("role", "user", "content", contexto.texto() + "\n\nPergunta: " + userText));
        }

        // Call Ollama
        String botReply;
        if (MODE_CLOSED.equals(mode) && fontes.isEmpty()) {
            // Closed mode never falls back to the model's own knowledge
            botReply = "Não encontrei esse assunto na base de conhecimento do EduFinance. "
                    + "Tente reformular a pergunta ou troque para o modo **Aberto** para buscar na web.";
        } else try {
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

        if (MODE_OPEN.equals(mode) && fontes.isEmpty()) {
            botReply = "⚠️ *Não consegui buscar na web agora; esta resposta usa apenas o conhecimento do modelo.*\n\n"
                    + botReply;
        }

        // Persist bot reply
        ChatMessage botMsg = new ChatMessage(session, "assistant", botReply);
        botMsg.setMode(mode);
        try {
            botMsg.setSources(fontes.isEmpty() ? null : objectMapper.writeValueAsString(fontes));
        } catch (Exception e) {
            botMsg.setSources(null);
        }
        messageRepository.save(botMsg);

        // Update session timestamp
        session.setUpdatedAt(LocalDateTime.now());
        sessionRepository.save(session);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("sessionId", session.getId());
        result.put("sessionTitle", session.getTitle());
        result.put("model", selectedModel);
        result.put("reply", botReply);
        result.put("mode", mode);
        result.put("sources", fontes);
        return result;
    }

    /** Closed mode: excerpts from the lessons and from the documents in the knowledge folder. */
    private Contexto buscarNaBase(String pergunta) {
        StringBuilder texto = new StringBuilder(
                "Responda usando SOMENTE os trechos abaixo, retirados da base de conhecimento do EduFinance. "
                        + "Se eles não trouxerem a resposta, diga que a base não cobre esse assunto. "
                        + "Não use nenhum outro conhecimento.\n");
        Map<String, Map<String, String>> fontes = new LinkedHashMap<>();
        for (KnowledgeBaseService.Trecho trecho : knowledgeBaseService.buscar(pergunta, 4)) {
            texto.append("\n[").append(trecho.fonte()).append("]\n").append(trecho.texto()).append("\n");
            fontes.putIfAbsent(trecho.fonte(), Map.of("title", trecho.fonte()));
        }
        return new Contexto(texto.toString(), new ArrayList<>(fontes.values()));
    }

    /** Open mode: web search results; if the search fails, recent news about the subject. */
    private Contexto buscarNaWeb(String pergunta) {
        String consulta = pergunta.length() > 200 ? pergunta.substring(0, 200) : pergunta;
        StringBuilder texto = new StringBuilder("Hoje é "
                + LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))
                + ". Abaixo estão resultados de uma busca na web feita agora. Use-os para responder, "
                + "dando preferência a eles quando trouxerem dados mais recentes que os seus, "
                + "e cite o número da fonte entre colchetes, como [1]. Se os resultados não trouxerem o número ou "
                + "o dado pedido, diga isso e indique em qual fonte consultar; nunca invente valores.\n");
        List<Map<String, String>> fontes = new ArrayList<>();

        for (WebSearchService.Resultado r : webSearchService.buscar(consulta, 6)) {
            fontes.add(Map.of("title", r.titulo(), "url", r.url()));
            texto.append("\n[").append(fontes.size()).append("] ").append(r.titulo())
                    .append("\n").append(r.resumo()).append("\n");
        }

        if (fontes.isEmpty()) {
            try {
                for (Article a : newsService.buscarNoticias(consulta, "pt").getArticles()) {
                    if (a.getTitle() == null || a.getUrl() == null) {
                        continue;
                    }
                    fontes.add(Map.of("title", a.getTitle(), "url", a.getUrl()));
                    texto.append("\n[").append(fontes.size()).append("] ").append(a.getTitle()).append("\n")
                            .append(a.getDescription() != null ? a.getDescription() : "").append("\n");
                    if (fontes.size() >= 5) {
                        break;
                    }
                }
            } catch (Exception e) {
                System.err.println("Busca de notícias para o FinBot falhou: " + e.getMessage());
            }
        }
        return new Contexto(texto.toString(), fontes);
    }

    /** Documents that make up the closed-mode knowledge base. */
    public List<Map<String, Object>> getKnowledgeSources() {
        return knowledgeBaseService.listarFontes();
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
