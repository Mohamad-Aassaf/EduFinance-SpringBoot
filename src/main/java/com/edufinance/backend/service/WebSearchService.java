package com.edufinance.backend.service;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

/**
 * Busca na web usada pelo modo "aberto" do FinBot.
 *
 * O Ollama não acessa a internet sozinho: quem busca é o backend, que depois
 * entrega os resultados ao modelo junto com a pergunta. A busca usa a versão
 * HTML do DuckDuckGo, que não exige chave de API. Como o resumo do buscador
 * muitas vezes não traz o dado pedido (uma taxa, uma cotação), as primeiras
 * páginas também são abertas e as frases mais ligadas à pergunta entram no resumo.
 */
@Service
public class WebSearchService {

    public record Resultado(String titulo, String url, String resumo) {
    }

    private static final String USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            + "(KHTML, like Gecko) Chrome/126.0 Safari/537.36";

    // Quantas páginas são abertas para complementar o resumo do buscador
    private static final int PAGINAS_LIDAS = 3;

    @Value("${finbot.web.search.url:https://html.duckduckgo.com/html/}")
    private String searchUrl;

    /** Devolve até {@code maximo} resultados; lista vazia se a busca falhar. */
    public List<Resultado> buscar(String consulta, int maximo) {
        List<Resultado> resultados = new ArrayList<>();
        try {
            Document pagina = Jsoup.connect(searchUrl)
                    .data("q", consulta)
                    .data("kl", "br-pt")
                    .userAgent(USER_AGENT)
                    .timeout(10_000)
                    .get();

            for (Element item : pagina.select("div.result:not(.result--ad)")) {
                Element link = item.selectFirst("a.result__a");
                Element resumo = item.selectFirst(".result__snippet");
                if (link == null || resumo == null) {
                    continue;
                }
                resultados.add(new Resultado(link.text(), extrairUrl(link.attr("href")), resumo.text()));
                if (resultados.size() >= maximo) {
                    break;
                }
            }
        } catch (Exception e) {
            System.err.println("Busca na web falhou: " + e.getMessage());
        }
        return complementar(resultados, consulta);
    }

    /** Abre as primeiras páginas em paralelo e junta ao resumo as frases que tratam da pergunta. */
    private List<Resultado> complementar(List<Resultado> resultados, String consulta) {
        Set<String> termos = palavras(consulta);
        List<CompletableFuture<String>> leituras = new ArrayList<>();
        for (int i = 0; i < Math.min(PAGINAS_LIDAS, resultados.size()); i++) {
            String url = resultados.get(i).url();
            leituras.add(CompletableFuture.supplyAsync(() -> frasesRelevantes(url, termos))
                    .completeOnTimeout("", 6, TimeUnit.SECONDS));
        }

        List<Resultado> completos = new ArrayList<>(resultados);
        for (int i = 0; i < leituras.size(); i++) {
            String frases = leituras.get(i).join();
            if (!frases.isEmpty()) {
                Resultado r = resultados.get(i);
                completos.set(i, new Resultado(r.titulo(), r.url(), r.resumo() + " " + frases));
            }
        }
        return completos;
    }

    private static String frasesRelevantes(String url, Set<String> termos) {
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            return "";
        }
        try {
            Document pagina = Jsoup.connect(url).userAgent(USER_AGENT).timeout(5_000).maxBodySize(1_500_000).get();
            pagina.select("script, style, nav, header, footer, aside, form").remove();

            record Frase(String texto, double pontos) {
            }
            List<Frase> frases = new ArrayList<>();
            for (String frase : pagina.body().text().split("(?<=[.!?])\\s+")) {
                if (frase.length() < 40 || frase.length() > 350) {
                    continue;
                }
                Set<String> daFrase = palavras(frase);
                double pontos = termos.stream().filter(daFrase::contains).count();
                // frases com números costumam trazer o dado procurado (taxa, cotação, data)
                if (pontos > 0 && frase.matches(".*\\d.*")) {
                    pontos += 0.5;
                }
                if (pontos >= 1.5) {
                    frases.add(new Frase(frase, pontos));
                }
            }
            frases.sort(Comparator.comparingDouble(Frase::pontos).reversed());
            return String.join(" ", frases.stream().limit(3).map(Frase::texto).toList());
        } catch (Exception e) {
            return "";
        }
    }

    /** Palavras com 4 letras ou mais, em minúsculas e sem acento. */
    private static Set<String> palavras(String texto) {
        String limpo = Normalizer.normalize(texto.toLowerCase(), Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        Set<String> palavras = new LinkedHashSet<>();
        for (String palavra : limpo.split("[^a-z0-9]+")) {
            if (palavra.length() >= 4) {
                palavras.add(palavra);
            }
        }
        return palavras;
    }

    /** Os links vêm como //duckduckgo.com/l/?uddg=URL_CODIFICADA; devolve a URL de destino. */
    private static String extrairUrl(String href) {
        int inicio = href.indexOf("uddg=");
        if (inicio < 0) {
            return href.startsWith("//") ? "https:" + href : href;
        }
        String codificada = href.substring(inicio + 5);
        int fim = codificada.indexOf('&');
        if (fim >= 0) {
            codificada = codificada.substring(0, fim);
        }
        return URLDecoder.decode(codificada, StandardCharsets.UTF_8);
    }
}
