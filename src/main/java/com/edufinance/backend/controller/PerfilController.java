package com.edufinance.backend.controller;

import com.edufinance.backend.model.Perfil;
import com.edufinance.backend.model.Medalha;
import com.edufinance.backend.repository.PerfilRepository;
import com.edufinance.backend.repository.MedalhaRepository;
import com.edufinance.backend.dto.RankingDtos.DadosLocalizacao;
import com.edufinance.backend.service.RegraNegocioException;
import com.edufinance.backend.service.UsuarioAtualService;
import org.springframework.http.HttpStatus;
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

    @Autowired
    private UsuarioAtualService usuarioAtual;

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

    /*
     * Atualiza a localização do usuário logado, usada nos rankings regionais.
     * O perfil vem do token, então ninguém altera a localização de outra pessoa.
     * Campos em branco apagam a informação; cidade exige estado e estado exige país.
     */
    @PutMapping("/me/localizacao")
    public ResponseEntity<Perfil> updateLocalizacao(@RequestBody DadosLocalizacao dados) {
        Perfil perfil = usuarioAtual.exigir();

        String pais = limpar(dados.pais());
        String estado = limpar(dados.estado());
        String cidade = limpar(dados.cidade());

        if (pais != null) {
            pais = pais.toUpperCase(java.util.Locale.ROOT);
            if (!pais.matches("[A-Z]{2}")) {
                throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "País inválido: use o código de duas letras (ex.: BR).");
            }
        }
        if (estado != null && pais == null) {
            throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "Informe o país antes do estado.");
        }
        if (cidade != null && estado == null) {
            throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "Informe o estado antes da cidade.");
        }
        if (estado != null && estado.length() > 60) {
            throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "O estado deve ter no máximo 60 caracteres.");
        }
        if (cidade != null && cidade.length() > 80) {
            throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "A cidade deve ter no máximo 80 caracteres.");
        }

        perfil.setPais(pais);
        perfil.setEstado(estado);
        perfil.setCidade(cidade);
        return ResponseEntity.ok(perfilRepository.save(perfil));
    }

    // Tira espaços das pontas e colapsa os internos; texto vazio vira null
    private static String limpar(String texto) {
        if (texto == null) {
            return null;
        }
        String limpo = texto.replaceAll("\\p{Cntrl}", " ").replaceAll("\\s+", " ").trim();
        return limpo.isEmpty() ? null : limpo;
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
