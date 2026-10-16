package com.edufinance.backend.controller;

import com.edufinance.backend.config.JwtUtil;
import com.edufinance.backend.model.ChatMessage;
import com.edufinance.backend.model.ChatSession;
import com.edufinance.backend.model.Perfil;
import com.edufinance.backend.repository.PerfilRepository;
import com.edufinance.backend.service.FinBotService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/finbot")
public class FinBotController {

    @Autowired
    private FinBotService finBotService;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private PerfilRepository perfilRepository;

    /** Returns available Ollama models for the model-switcher UI */
    @GetMapping("/models")
    public ResponseEntity<List<Map<String, Object>>> getModels() {
        return ResponseEntity.ok(finBotService.getAvailableModels());
    }

    /** Which AI host is active (visible to every user; URLs are admin-only) */
    @GetMapping("/config")
    public ResponseEntity<Map<String, Object>> getConfig() {
        return ResponseEntity.ok(finBotService.getPublicConfig());
    }

    /** Admin: checks the password and returns the full AI host configuration */
    @PostMapping("/admin/login")
    public ResponseEntity<Map<String, Object>> adminLogin(@RequestBody Map<String, String> body) {
        finBotService.exigirAdmin(body.get("password"));
        return ResponseEntity.ok(finBotService.getConfig());
    }

    /** Admin: updates the AI host used by every user of the application */
    @PostMapping("/config")
    public ResponseEntity<Map<String, Object>> updateConfig(@RequestBody Map<String, String> body) {
        finBotService.exigirAdmin(body.get("password"));
        return ResponseEntity.ok(finBotService.updateConfig(body));
    }

    /** Admin: tests an address without changing the configuration in use */
    @PostMapping("/admin/test")
    public ResponseEntity<Map<String, Object>> adminTest(@RequestBody Map<String, String> body) {
        finBotService.exigirAdmin(body.get("password"));
        String modo = body.getOrDefault("activeHostMode", "custom");
        return ResponseEntity.ok(finBotService.testarServidor(body.get("url"), modo));
    }

    /** Test connection to the currently selected AI Host */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> checkStatus() {
        return ResponseEntity.ok(finBotService.checkStatus());
    }

    /**
     * Main chat endpoint. Accepts JSON body:
     * {
     *   "sessionId": 123,          // optional — null = start new conversation
     *   "model":    "llama3.2:1b",
     *   "message":  "O que é a taxa Selic?",
     *   "mode":     "closed"       // optional — "closed" = base própria, "open" = busca na web
     * }
     */
    @PostMapping("/chat")
    public ResponseEntity<Map<String, Object>> chat(
            @RequestBody Map<String, Object> body,
            HttpServletRequest request) {

        Long userId = getUserIdFromRequest(request);

        Long sessionId = body.containsKey("sessionId") && body.get("sessionId") != null
                ? Long.valueOf(body.get("sessionId").toString())
                : null;
        String model   = (String) body.get("model");
        String message = (String) body.get("message");
        String mode    = (String) body.get("mode");

        if (message == null || message.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Mensagem não pode estar vazia."));
        }

        Map<String, Object> result = finBotService.chat(userId, sessionId, model, message, mode);
        return ResponseEntity.ok(result);
    }

    /** Lists the documents (lessons and files) used by the closed mode */
    @GetMapping("/knowledge")
    public ResponseEntity<List<Map<String, Object>>> getKnowledgeSources() {
        return ResponseEntity.ok(finBotService.getKnowledgeSources());
    }

    /** List all chat sessions for the authenticated user */
    @GetMapping("/history")
    public ResponseEntity<List<ChatSession>> getHistory(HttpServletRequest request) {
        Long userId = getUserIdFromRequest(request);
        return ResponseEntity.ok(finBotService.getSessionsForUser(userId));
    }

    /** Load all messages for a specific session */
    @GetMapping("/history/{sessionId}/messages")
    public ResponseEntity<List<ChatMessage>> getSessionMessages(
            @PathVariable Long sessionId) {
        return ResponseEntity.ok(finBotService.getMessagesForSession(sessionId));
    }

    /** Delete a session and all its messages */
    @DeleteMapping("/history/{sessionId}")
    public ResponseEntity<Void> deleteSession(@PathVariable Long sessionId) {
        finBotService.deleteSession(sessionId);
        return ResponseEntity.noContent().build();
    }

    // ----------------------------------------------------------------
    // Helper — extract userId by looking up email from JWT token
    // ----------------------------------------------------------------
    private Long getUserIdFromRequest(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            throw new RuntimeException("Token JWT ausente ou inválido");
        }
        String token = header.substring(7);
        String email = jwtUtil.extrairEmail(token);
        Perfil perfil = perfilRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado: " + email));
        return perfil.getId();
    }
}
