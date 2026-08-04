package com.teste.geminitester.model;

import java.util.List;

public class GeminiRequest {

    private List<Content> contents;
    private GenerationConfig generationConfig;

    public List<Content> getContents() { return contents; }
    public void setContents(List<Content> contents) { this.contents = contents; }

    public GenerationConfig getGenerationConfig() { return generationConfig; }
    public void setGenerationConfig(GenerationConfig generationConfig) { this.generationConfig = generationConfig; }

    public static class Content {
        private List<Part> parts;
        private String role;

        public List<Part> getParts() { return parts; }
        public void setParts(List<Part> parts) { this.parts = parts; }

        public String getRole() { return role; }
        public void setRole(String role) { this.role = role; }
    }

    public static class Part {
        private String text;

        public String getText() { return text; }
        public void setText(String text) { this.text = text; }
    }

    public static class GenerationConfig {
        private double temperature;
        private int maxOutputTokens;

        public double getTemperature() { return temperature; }
        public void setTemperature(double temperature) { this.temperature = temperature; }

        public int getMaxOutputTokens() { return maxOutputTokens; }
        public void setMaxOutputTokens(int maxOutputTokens) { this.maxOutputTokens = maxOutputTokens; }
    }
}
