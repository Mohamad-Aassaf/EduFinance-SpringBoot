package com.edufinance.backend.service;

import com.kwabenaberko.newsapilib.NewsApiClient;
import com.kwabenaberko.newsapilib.models.request.EverythingRequest;
import com.kwabenaberko.newsapilib.models.request.TopHeadlinesRequest;
import com.kwabenaberko.newsapilib.models.request.SourcesRequest;
import com.kwabenaberko.newsapilib.models.response.ArticleResponse;
import com.kwabenaberko.newsapilib.models.response.SourcesResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

@Service
public class NewsService {

    // O plano gratuito da NewsAPI permite 100 requisições por dia, então cada busca fica guardada por um tempo
    private static final long CACHE_TTL_MS = TimeUnit.MINUTES.toMillis(15);

    private record CacheEntry(ArticleResponse response, long criadoEm) {
    }

    private final NewsApiClient newsApiClient;
    private final Map<String, CacheEntry> cache = new ConcurrentHashMap<>();

    public NewsService(@Value("${news.api.key:82fff253944e453a901cb88b293dbbb7}") String apiKey) {
        // Initializes the client with the injected API key.
        // Falls back to "YOUR_API_KEY" if not specified in properties.
        this.newsApiClient = new NewsApiClient(apiKey);
    }

    /**
     * Busca notícias (endpoint "everything") reaproveitando o resultado de buscas iguais feitas há pouco.
     */
    public ArticleResponse buscarNoticias(String query, String language) {
        String chave = language + "|" + query.trim().toLowerCase();
        CacheEntry salvo = cache.get(chave);
        if (salvo != null && System.currentTimeMillis() - salvo.criadoEm() < CACHE_TTL_MS) {
            return salvo.response();
        }
        ArticleResponse response = getEverything(query, language).orTimeout(20, TimeUnit.SECONDS).join();
        cache.put(chave, new CacheEntry(response, System.currentTimeMillis()));
        return response;
    }

    /**
     * Search through millions of articles from over 80,000 large and small news
     * sources.
     */
    public CompletableFuture<ArticleResponse> getEverything(String query, String language) {
        CompletableFuture<ArticleResponse> future = new CompletableFuture<>();
        newsApiClient.getEverything(
                new EverythingRequest.Builder()
                        .q(query)
                        .language(language)
                        .sortBy("publishedAt")
                        .pageSize(30)
                        .build(),
                new NewsApiClient.ArticlesResponseCallback() {
                    @Override
                    public void onSuccess(ArticleResponse response) {
                        future.complete(response);
                    }

                    @Override
                    public void onFailure(Throwable throwable) {
                        future.completeExceptionally(throwable);
                    }
                });
        return future;
    }

    /**
     * Provides live, top headlines for a country, category, source, or query.
     */
    public CompletableFuture<ArticleResponse> getTopHeadlines(String query, String language) {
        CompletableFuture<ArticleResponse> future = new CompletableFuture<>();
        newsApiClient.getTopHeadlines(
                new TopHeadlinesRequest.Builder()
                        .q(query)
                        .language(language)
                        .build(),
                new NewsApiClient.ArticlesResponseCallback() {
                    @Override
                    public void onSuccess(ArticleResponse response) {
                        future.complete(response);
                    }

                    @Override
                    public void onFailure(Throwable throwable) {
                        future.completeExceptionally(throwable);
                    }
                });
        return future;
    }

    /**
     * Returns the subset of news sources that top headlines are available from.
     */
    public CompletableFuture<SourcesResponse> getSources(String language, String country) {
        CompletableFuture<SourcesResponse> future = new CompletableFuture<>();
        newsApiClient.getSources(
                new SourcesRequest.Builder()
                        .language(language)
                        .country(country)
                        .build(),
                new NewsApiClient.SourcesCallback() {
                    @Override
                    public void onSuccess(SourcesResponse response) {
                        future.complete(response);
                    }

                    @Override
                    public void onFailure(Throwable throwable) {
                        future.completeExceptionally(throwable);
                    }
                });
        return future;
    }
}
