package com.edufinance.backend.controller;

import com.edufinance.backend.model.Perfil;
import com.edufinance.backend.model.Medalha;
import com.edufinance.backend.repository.PerfilRepository;
import com.edufinance.backend.repository.MedalhaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/perfis")
@CrossOrigin(origins = "*")
public class PerfilController {

    @Autowired
    private PerfilRepository perfilRepository;

    @Autowired
    private MedalhaRepository medalhaRepository;

    // Retorna as medalhas conquistadas por um usuário
    @GetMapping("/{id}/medalhas")
    public List<Medalha> getMedalhas(@PathVariable Long id) {
        return medalhaRepository.findByUsuarioId(id);
    }

    // Retorna o perfil do usuário logado (baseado no token JWT)
    @GetMapping("/me")
    public ResponseEntity<Perfil> getMyProfile() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        String email;
        if (principal instanceof UserDetails) {
            email = ((UserDetails) principal).getUsername();
        } else {
            email = principal.toString();
        }
        
        Optional<Perfil> perfilOpt = perfilRepository.findByEmail(email);
        return perfilOpt.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    // Retorna detalhes de um perfil por ID
    @GetMapping("/{id}")
    public ResponseEntity<Perfil> getPerfil(@PathVariable Long id) {
        Optional<Perfil> perfilOpt = perfilRepository.findById(id);
        if (perfilOpt.isPresent()) {
            return ResponseEntity.ok(perfilOpt.get());
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    // Retorna a lista de perfis ordenada pelo XP decrescente (Ranking)
    @GetMapping("/ranking")
    public List<Perfil> getRanking() {
        return perfilRepository.findAllByOrderByXpDesc();
    }

    // Atualiza nome ou imagem de avatar do perfil
    @PutMapping("/{id}")
    public ResponseEntity<Perfil> updateProfile(
            @PathVariable Long id,
            @RequestBody Map<String, String> request) {
        Optional<Perfil> perfilOpt = perfilRepository.findById(id);
        if (perfilOpt.isPresent()) {
            Perfil perfil = perfilOpt.get();
            if (request.containsKey("nome")) {
                perfil.setNome(request.get("nome"));
            }
            if (request.containsKey("name")) {
                perfil.setNome(request.get("name"));
            }
            if (request.containsKey("avatarUrl")) {
                perfil.setAvatarUrl(request.get("avatarUrl"));
            }
            if (request.containsKey("avatar_url")) {
                perfil.setAvatarUrl(request.get("avatar_url"));
            }
            Perfil atualizado = perfilRepository.save(perfil);
            return ResponseEntity.ok(atualizado);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    // Atualiza o saldo virtual do usuário
    @PutMapping("/{id}/saldo")
    public ResponseEntity<Perfil> updateSaldo(@PathVariable Long id, @RequestParam double valor) {
        Optional<Perfil> perfilOpt = perfilRepository.findById(id);
        if (perfilOpt.isPresent()) {
            Perfil perfil = perfilOpt.get();
            perfil.setSaldoVirtual(valor);
            Perfil atualizado = perfilRepository.save(perfil);
            return ResponseEntity.ok(atualizado);
        } else {
            return ResponseEntity.notFound().build();
        }
    }
}
