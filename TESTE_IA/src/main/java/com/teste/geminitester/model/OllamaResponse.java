package com.teste.geminitester.model;

/**
 * Response da API do Ollama (/api/chat).
 *
 * Formato:
 * {
 *   "model": "gemma3:12b",
 *   "message": { "role": "assistant", "content": "Olá! Como posso ajudar?" },
 *   "done": true,
 *   "eval_count": 123,
 *   "prompt_eval_count": 45
 * }
 */
public class OllamaResponse {

    private String model;
    private Message message;
    private boolean done;

    // Tokens de avaliação (opcional — Ollama retorna quando done=true)
    private Integer eval_count;
    private Integer prompt_eval_count;

    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }

    public Message getMessage() { return message; }
    public void setMessage(Message message) { this.message = message; }

    public boolean isDone() { return done; }
    public void setDone(boolean done) { this.done = done; }

    public Integer getEval_count() { return eval_count; }
    public void setEval_count(Integer eval_count) { this.eval_count = eval_count; }

    public Integer getPrompt_eval_count() { return prompt_eval_count; }
    public void setPrompt_eval_count(Integer prompt_eval_count) { this.prompt_eval_count = prompt_eval_count; }

    public int getTotalTokens() {
        int e = eval_count != null ? eval_count : 0;
        int p = prompt_eval_count != null ? prompt_eval_count : 0;
        return e + p;
    }

    public static class Message {
        private String role;
        private String content;

        public String getRole() { return role; }
        public void setRole(String role) { this.role = role; }

        public String getContent() { return content; }
        public void setContent(String content) { this.content = content; }
    }
}
