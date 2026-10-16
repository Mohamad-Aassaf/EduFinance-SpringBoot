package com.edufinance.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Pergunta introdutória das Boas-Vindas: "O que é educação financeira?".
 *
 * A avaliação é feita em duas etapas, para a IA não elogiar respostas sem sentido:
 * 1. O Ollama só marca verdadeiro/falso: a resposta fala de finanças? E cita cada ideia-chave
 *    (orçamento, poupar, dívidas, planejar, investir)? Marcar fatos é bem mais confiável que dar nota.
 * 2. A nota, os acertos e o que faltou são calculados aqui, a partir dessas marcações.
 *    O Ollama só escreve o feedback, já sabendo a nota e com instruções de tom para cada faixa.
 *    Se o texto elogiar uma resposta fraca, ele é trocado por uma mensagem fixa.
 *
 * Usa o mistral:7b: nos testes o llama3.2:1b marcou respostas boas como "fora do assunto".
 * Se o modelo não responder, a pessoa recebe a resposta de referência sem nota e segue em frente.
 */
@Service
public class BoasVindasService {

    public static final String PERGUNTA = "O que é educação financeira?";

    public static final String RESPOSTA_REFERENCIA = "Educação financeira é o conjunto de conhecimentos e hábitos que "
            + "ajudam a pessoa a cuidar bem do próprio dinheiro: saber quanto ganha e quanto gasta, montar um orçamento, "
            + "poupar, evitar dívidas caras, ter uma reserva de emergência, planejar objetivos e investir com consciência, "
            + "para tomar decisões melhores e ter mais segurança hoje e no futuro.";

    /** Ideia-chave da resposta: chave do JSON, como perguntar à IA e como mostrar ao usuário. */
    private record Ideia(String chave, String pergunta, String rotulo) {
    }

    private static final List<Ideia> IDEIAS = List.of(
            new Ideia("orcamento", "organizar o orçamento, controlar os gastos, gastar menos do que ganha ou saber quanto ganha e quanto gasta",
                    "organizar o orçamento e controlar os gastos"),
            new Ideia("poupar", "poupar, guardar dinheiro, não gastar tudo ou ter uma reserva de emergência",
                    "poupar e ter uma reserva de emergência"),
            new Ideia("dividas", "evitar dívidas ou usar o crédito com cuidado", "evitar dívidas"),
            new Ideia("planejar", "planejar objetivos ou pensar no futuro financeiro", "planejar objetivos para o futuro"),
            new Ideia("investir", "investir o dinheiro", "investir com consciência"));

    // Elogios que não combinam com nota baixa
    private static final Pattern ELOGIO = Pattern.compile(
            "caminho certo|parab[ée]ns|muito bem|[óo]tim[oa]|excelente|acertou|mandou bem|boa resposta|correto",
            Pattern.CASE_INSENSITIVE);

    // Frases que já avisam que a resposta fugiu do assunto
    private static final Pattern FORA_DO_ASSUNTO = Pattern.compile(
            "n[ãa]o (tem|est[áa]) (a ver|rela)|n[ãa]o fala|fora do assunto|outro assunto",
            Pattern.CASE_INSENSITIVE);

    private final WebClient webClient;
    private final FinBotService finBotService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${finbot.boasvindas.model:mistral:7b}")
    private String modelo;

    public BoasVindasService(WebClient.Builder webClientBuilder, FinBotService finBotService) {
        this.webClient = webClientBuilder.build();
        this.finBotService = finBotService;
    }

    /** Devolve nota, acertos, faltou, feedback, ideias, respostaReferencia e avaliadoPorIa. */
    public Map<String, Object> avaliar(String resposta) {
        Map<String, Object> resultado = new LinkedHashMap<>();
        resultado.put("respostaReferencia", RESPOSTA_REFERENCIA);

        JsonNode marcacoes;
        try {
            marcacoes = classificar(resposta);
        } catch (Exception e) {
            System.err.println("Boas-Vindas: avaliação com " + modelo + " falhou: " + e.getMessage());
            resultado.put("nota", null);
            resultado.put("acertos", "");
            resultado.put("faltou", "");
            resultado.put("ideias", List.of());
            resultado.put("feedback", "Não consegui falar com a IA agora, então não dei nota para a sua resposta. "
                    + "Compare o que você escreveu com a resposta abaixo: é exatamente isso que vamos praticar juntos por aqui!");
            resultado.put("avaliadoPorIa", false);
            return resultado;
        }

        boolean relacionada = marcacoes.path("relacionada").asBoolean(false);
        List<String> presentes = new ArrayList<>();
        List<String> ausentes = new ArrayList<>();
        List<Map<String, Object>> ideias = new ArrayList<>();
        for (Ideia ideia : IDEIAS) {
            boolean presente = relacionada && marcacoes.path(ideia.chave()).asBoolean(false);
            (presente ? presentes : ausentes).add(ideia.rotulo());
            ideias.add(Map.of("ideia", ideia.rotulo(), "presente", presente));
        }

        // Fora do assunto vale 0; falar de finanças já vale 3, e cada ideia-chave soma 2
        int nota = relacionada ? Math.min(10, 3 + 2 * presentes.size()) : 0;

        resultado.put("nota", nota);
        resultado.put("acertos", relacionada
                ? (presentes.isEmpty() ? "Você relacionou educação financeira com o cuidado com o dinheiro." : "Você falou em " + juntar(presentes) + ".")
                : "");
        resultado.put("faltou", !relacionada
                ? "A resposta não fala de dinheiro nem de finanças pessoais, que é o assunto da pergunta."
                : ausentes.isEmpty() ? "" : "Também faz parte: " + juntar(ausentes) + ".");
        resultado.put("ideias", ideias);
        resultado.put("feedback", escreverFeedback(resposta, nota, relacionada, presentes, ausentes));
        resultado.put("avaliadoPorIa", true);
        return resultado;
    }

    // ─── Etapa 1: marcações verdadeiro/falso ─────────────────────────────────

    private JsonNode classificar(String resposta) throws Exception {
        StringBuilder pedido = new StringBuilder("Pergunta feita ao aluno: \"" + PERGUNTA + "\"\n\n")
                .append("Resposta do aluno: \"").append(resposta.replace("\"", "'")).append("\"\n\n")
                .append("Marque true ou false:\n")
                .append("- relacionada: a resposta fala de dinheiro, finanças pessoais ou economia? ")
                .append("(false se fala de outro assunto, como esporte, ou se não faz sentido)\n");
        Map<String, Object> propriedades = new LinkedHashMap<>();
        propriedades.put("relacionada", Map.of("type", "boolean"));
        for (Ideia ideia : IDEIAS) {
            pedido.append("- ").append(ideia.chave()).append(": a resposta fala em ").append(ideia.pergunta()).append("?\n");
            propriedades.put(ideia.chave(), Map.of("type", "boolean"));
        }
        Map<String, Object> formato = Map.of(
                "type", "object",
                "properties", propriedades,
                "required", new ArrayList<>(propriedades.keySet()));

        String conteudo = chamarOllama(
                "Você é um avaliador rigoroso. Analise APENAS o que está escrito na resposta do aluno, sem supor nada. "
                        + "Responda só com JSON.",
                pedido.toString(), formato, 0);
        JsonNode marcacoes = objectMapper.readTree(conteudo);
        if (!marcacoes.path("relacionada").isBoolean()) {
            throw new IllegalStateException("resposta fora do formato: " + conteudo);
        }
        return marcacoes;
    }

    // ─── Etapa 2: feedback escrito pela IA, com o tom definido pela nota ─────

    private String escreverFeedback(String resposta, int nota, boolean relacionada, List<String> presentes, List<String> ausentes) {
        String tom;
        if (!relacionada) {
            tom = "A resposta NÃO tem relação com educação financeira. Diga isso com gentileza e bom humor, sem elogiar a "
                    + "resposta e sem dizer que o aluno está no caminho certo. Explique em uma frase o que é educação "
                    + "financeira de verdade e convide o aluno a aprender na plataforma.";
        } else if (nota <= 5) {
            tom = "A resposta está incompleta. Reconheça o que o aluno citou, sem exagerar nos elogios, e explique o que faltou.";
        } else if (nota <= 8) {
            tom = "A resposta é boa, mas não completa. Elogie o que o aluno acertou e mencione o que faltou.";
        } else {
            tom = "A resposta está completa. Parabenize o aluno com entusiasmo.";
        }

        String pedido = "Pergunta: " + PERGUNTA + "\nResposta do aluno: \"" + resposta.replace("\"", "'") + "\"\n"
                + "Nota: " + nota + " de 10.\n"
                + "Ideias que o aluno citou: " + (presentes.isEmpty() ? "nenhuma" : String.join("; ", presentes)) + ".\n"
                + "Ideias que faltaram: " + (ausentes.isEmpty() ? "nenhuma" : String.join("; ", ausentes)) + ".\n\n"
                + tom + "\nEscreva no máximo 3 frases curtas, falando direto com o aluno. Não mencione a nota. "
                + "Responda em JSON: {\"feedback\": \"...\"}.";

        try {
            String conteudo = chamarOllama(
                    "Você é o Professor FinBot, tutor de educação financeira da plataforma EduFinance. Fale em português "
                            + "do Brasil, de forma acolhedora e sincera, tratando o aluno por 'você'.",
                    pedido, Map.of("type", "object", "properties", Map.of("feedback", Map.of("type", "string")),
                            "required", List.of("feedback")),
                    0.3);
            String feedback = objectMapper.readTree(conteudo).path("feedback").asText("").trim();
            // Rede de segurança: nota baixa nunca recebe elogio
            if (!feedback.isEmpty() && !(nota <= 3 && ELOGIO.matcher(feedback).find())) {
                // Fora do assunto, o feedback sempre começa deixando isso claro
                if (!relacionada && !FORA_DO_ASSUNTO.matcher(feedback).find()) {
                    feedback = "Hmm, essa resposta não tem a ver com educação financeira. " + feedback;
                }
                return feedback;
            }
        } catch (Exception e) {
            System.err.println("Boas-Vindas: feedback com " + modelo + " falhou: " + e.getMessage());
        }
        return feedbackPadrao(nota, relacionada, ausentes);
    }

    private static String feedbackPadrao(int nota, boolean relacionada, List<String> ausentes) {
        if (!relacionada) {
            return "Hmm, essa resposta não tem a ver com educação financeira. Educação financeira é sobre cuidar bem do "
                    + "seu dinheiro: gastar com consciência, poupar e planejar o futuro. Fica tranquilo, é isso que você "
                    + "vai aprender aqui!";
        }
        if (ausentes.isEmpty()) {
            return "Resposta completa! Você já conhece as ideias principais da educação financeira. Agora é colocar em prática.";
        }
        return (nota <= 5 ? "Você começou bem, mas ainda dá para ir além. " : "Boa resposta! ")
                + "Também fazem parte da educação financeira: " + juntar(ausentes) + ". Vamos ver tudo isso nas aulas!";
    }

    private String chamarOllama(String instrucoes, String pedido, Map<String, Object> formato, double temperatura)
            throws Exception {
        Map<String, Object> corpo = Map.of(
                "model", modelo,
                "messages", List.of(
                        Map.of("role", "system", "content", instrucoes),
                        Map.of("role", "user", "content", pedido)),
                "stream", false,
                "format", formato,
                "options", Map.of("temperature", temperatura));

        String respostaOllama = webClient.post()
                .uri(finBotService.getOllamaApiUrl() + "/api/chat")
                .header("Content-Type", "application/json")
                .bodyValue(corpo)
                .retrieve()
                .bodyToMono(String.class)
                .timeout(Duration.ofMinutes(3))
                .block();
        return objectMapper.readTree(respostaOllama).path("message").path("content").asText();
    }

    /** "a", "a e b", "a, b e c" */
    private static String juntar(List<String> itens) {
        if (itens.size() <= 1) {
            return String.join("", itens);
        }
        return String.join(", ", itens.subList(0, itens.size() - 1)) + " e " + itens.get(itens.size() - 1);
    }
}
