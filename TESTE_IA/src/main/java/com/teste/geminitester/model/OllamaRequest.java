package com.teste.geminitester.model;

import java.util.List;

/**
 * Request para a API do Ollama (/api/chat).
 *
 * Formato:
 * {
 *   "model": "gemma3:12b",
 *   "messages": [{ "role": "user", "content": "Olá!" }],
 *   "stream": false
 * }
 */
public class OllamaRequest {

    private String model;
    private List<Message> messages;
    private boolean stream = false;

    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }

    public List<Message> getMessages() { return messages; }
    public void setMessages(List<Message> messages) { this.messages = messages; }

    public boolean isStream() { return stream; }
    public void setStream(boolean stream) { this.stream = stream; }

    public static class Message {
        private String role;
        private String content;

        public Message() {}
        public Message(String role, String content) {
            this.role = role;
            this.content = content;
        }

        public String getRole() { return role; }
        public void setRole(String role) { this.role = role; }

        public String getContent() { return content; }
        public void setContent(String content) { this.content = content; }
    }
}
