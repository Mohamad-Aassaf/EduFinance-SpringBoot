package com.teste.geminitester.controller;

import com.teste.geminitester.model.OllamaRequest.Message;
import com.teste.geminitester.model.OllamaResponse;
import com.teste.geminitester.service.GeminiService;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Controller
public class GeminiController {

    private final GeminiService geminiService;

    public GeminiController(GeminiService geminiService) {
        this.geminiService = geminiService;
    }

    @GetMapping("/")
    public String index() { return "index"; }

    /**
     * Lista os modelos disponíveis com seus limites de contexto.
     */
    @GetMapping("/api/models")
    @ResponseBody
    public ResponseEntity<?> models() {
        return ResponseEntity.ok(Map.of(
                "models",       GeminiService.AVAILABLE_MODELS,
                "defaultModel", geminiService.getDefaultModel()
        ));
    }

    /**
     * Envia mensagem com histórico de conversa e modelo selecionado.
     *
     * Body esperado:
     * {
     *   "message": "texto atual",
     *   "model": "mistral:7b",
     *   "history": [
     *     { "role": "user",      "content": "pergunta anterior" },
     *     { "role": "assistant", "content": "resposta anterior" }
     *   ]
     * }
     */
    @PostMapping("/api/chat")
    @ResponseBody
    @SuppressWarnings("unchecked")
    public ResponseEntity<?> chat(@RequestBody Map<String, Object> body) {
        String message = (String) body.get("message");
        String model   = (String) body.getOrDefault("model", "");
        List<Map<String, String>> historyRaw =
                (List<Map<String, String>>) body.getOrDefault("history", List.of());

        if (message == null || message.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Mensagem não pode ser vazia."));
        }

        // Reconstrói o histórico como Messages
        List<Message> messages = new ArrayList<>();
        for (Map<String, String> h : historyRaw) {
            messages.add(new Message(h.get("role"), h.get("content")));
        }
        // Adiciona a mensagem atual
        messages.add(new Message("user", message));

        try {
            OllamaResponse response = geminiService.sendMessage(model, messages);
            String text = geminiService.extractText(response);

            return ResponseEntity.ok(Map.of(
                    "response",     text,
                    "model",        response.getModel() != null ? response.getModel() : model,
                    "promptTokens", response.getPrompt_eval_count() != null ? response.getPrompt_eval_count() : 0,
                    "evalTokens",   response.getEval_count()         != null ? response.getEval_count()         : 0,
                    "totalTokens",  response.getTotalTokens()
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/api/health")
    @ResponseBody
    public ResponseEntity<?> health() {
        return ResponseEntity.ok(Map.of(
                "status",    "UP",
                "service",   "Ollama Tester",
                "model",     geminiService.getDefaultModel(),
                "timestamp", System.currentTimeMillis()
        ));
    }
}
