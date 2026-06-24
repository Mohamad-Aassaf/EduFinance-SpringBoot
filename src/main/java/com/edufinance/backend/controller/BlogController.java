package com.edufinance.backend.controller;

import com.edufinance.backend.model.Perfil;
import com.edufinance.backend.repository.PerfilRepository;
import com.edufinance.backend.service.NewsService;
import com.kwabenaberko.newsapilib.models.response.ArticleResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/blog")
@CrossOrigin(origins = "*")
public class BlogController {

    private final NewsService newsService;
    private final PerfilRepository perfilRepository;

    public BlogController(NewsService newsService, PerfilRepository perfilRepository) {
        this.newsService = newsService;
        this.perfilRepository = perfilRepository;
    }

    /**
     * Endpoint hit when a user visits the blog.
     * Rewards the user with +15 XP for reading and updates their level.
     */
    @GetMapping("/{userId}")
    public ResponseEntity<Perfil> visitBlog(@PathVariable Long userId) {
        Optional<Perfil> perfilOpt = perfilRepository.findById(userId);
        if (perfilOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Perfil perfil = perfilOpt.get();
        
        // Reward 15 XP for reading the blog
        int oldXp = perfil.getXp();
        int newXp = oldXp + 15;
        perfil.setXp(newXp);
        
        // Update level: 100 XP per level
        int newLevel = (newXp / 100) + 1;
        perfil.setNivel(newLevel);

        Perfil saved = perfilRepository.save(perfil);
        return ResponseEntity.ok(saved);
    }

    /**
     * Endpoint to fetch live financial news from the News API.
     */
    @GetMapping("/news")
    public ResponseEntity<ArticleResponse> getNews(
            @RequestParam(defaultValue = "investimentos OR economia OR finanças OR \"educação financeira\"") String q,
            @RequestParam(defaultValue = "pt") String lang) {
        try {
            // Join blocks the thread until the future resolves, which fits standard Spring MVC
            ArticleResponse response = newsService.getEverything(q, lang).join();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }
}
