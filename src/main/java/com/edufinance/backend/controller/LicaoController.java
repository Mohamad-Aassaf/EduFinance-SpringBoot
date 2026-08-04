package com.edufinance.backend.controller;

import com.edufinance.backend.model.Licao;
import com.edufinance.backend.model.Perfil;
import com.edufinance.backend.model.Medalha;
import com.edufinance.backend.model.ProgressoUsuario;
import com.edufinance.backend.repository.LicaoRepository;
import com.edufinance.backend.repository.PerfilRepository;
import com.edufinance.backend.repository.MedalhaRepository;
import com.edufinance.backend.repository.ProgressoUsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/licoes")
@CrossOrigin(origins = "*")
public class LicaoController {

    @Autowired
    private LicaoRepository licaoRepository;

    @Autowired
    private ProgressoUsuarioRepository progressoUsuarioRepository;

    @Autowired
    private PerfilRepository perfilRepository;

    @Autowired
    private MedalhaRepository medalhaRepository;

    // Retorna todas as lições cadastradas
    @GetMapping
    public List<Licao> getAllLicoes() {
        return licaoRepository.findAll();
    }

    // Retorna todos os módulos distintos
    @GetMapping("/modulos")
    public List<String> getModulos() {
        List<Licao> todasLicoes = licaoRepository.findAll();
        List<String> modulos = new ArrayList<>();
        for (Licao licao : todasLicoes) {
            if (!modulos.contains(licao.getModulo())) {
                modulos.add(licao.getModulo());
            }
        }
        return modulos;
    }

    // Retorna as lições de um determinado módulo
    @GetMapping("/modulo/{modulo}")
    public List<Licao> getLicoesPorModulo(@PathVariable String modulo) {
        return licaoRepository.findByModulo(modulo);
    }

    // Retorna os detalhes de uma lição específica
    @GetMapping("/{id}")
    public ResponseEntity<Licao> getLicao(@PathVariable Long id) {
        Optional<Licao> licaoOpt = licaoRepository.findById(id);
        if (licaoOpt.isPresent()) {
            return ResponseEntity.ok(licaoOpt.get());
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    // Retorna o progresso das lições de um usuário
    @GetMapping("/usuario/{usuarioId}/progresso")
    public List<ProgressoUsuario> getProgressoUsuario(@PathVariable Long usuarioId) {
        return progressoUsuarioRepository.findByUsuarioId(usuarioId);
    }

    // Conclui uma lição, somando XP e verificando medalhas
    @PostMapping("/{id}/concluir")
    public ResponseEntity<?> concluirLicao(@PathVariable Long id, @RequestParam Long usuarioId) {
        Optional<Licao> licaoOpt = licaoRepository.findById(id);
        Optional<Perfil> perfilOpt = perfilRepository.findById(usuarioId);

        if (licaoOpt.isEmpty() || perfilOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("Lição ou usuário inválido.");
        }

        Licao licao = licaoOpt.get();
        Perfil perfil = perfilOpt.get();

        // 1. Salva o progresso como concluído
        Optional<ProgressoUsuario> progressoOpt = progressoUsuarioRepository.findByUsuarioIdAndLicaoId(perfil.getId(), licao.getId());
        if (progressoOpt.isEmpty()) {
            ProgressoUsuario progresso = new ProgressoUsuario();
            progresso.setUsuarioId(perfil.getId());
            progresso.setLicaoId(licao.getId());
            progresso.setConcluido(true);
            progresso.setConcluidoEm(LocalDateTime.now());
            progressoUsuarioRepository.save(progresso);
        } else {
            ProgressoUsuario progresso = progressoOpt.get();
            if (!progresso.isConcluido()) {
                progresso.setConcluido(true);
                progresso.setConcluidoEm(LocalDateTime.now());
                progressoUsuarioRepository.save(progresso);
            }
        }

        // 2. Adiciona 20 de XP
        int xpGanho = 20;
        int novoXp = perfil.getXp() + xpGanho;
        perfil.setXp(novoXp);
        perfil.setNivel((novoXp / 100) + 1); // 100 XP por nível
        perfilRepository.save(perfil);

        // 3. Libera medalhas dependendo do progresso
        List<String> medalhasDesbloqueadas = new ArrayList<>();
        long totalConcluidas = progressoUsuarioRepository.countByUsuarioIdAndConcluidoTrue(perfil.getId());

        if (totalConcluidas >= 1) {
            desbloquearMedalha(perfil.getId(), "Primeira Aula", medalhasDesbloqueadas);
        }
        if (totalConcluidas >= 5) {
            desbloquearMedalha(perfil.getId(), "Mestre das Finanças", medalhasDesbloqueadas);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("xpGanho", xpGanho);
        response.put("xpAtual", perfil.getXp());
        response.put("nivelAtual", perfil.getNivel());
        response.put("medalhasDesbloqueadas", medalhasDesbloqueadas);
        response.put("perfil", perfil);

        return ResponseEntity.ok(response);
    }

    private void desbloquearMedalha(Long usuarioId, String tipoMedalha, List<String> recemDesbloqueadas) {
        Optional<Medalha> medalhaOpt = medalhaRepository.findByUsuarioIdAndTipoMedalha(usuarioId, tipoMedalha);
        if (medalhaOpt.isEmpty()) {
            Medalha medalha = new Medalha();
            medalha.setUsuarioId(usuarioId);
            medalha.setTipoMedalha(tipoMedalha);
            medalhaRepository.save(medalha);
            recemDesbloqueadas.add(tipoMedalha);
        }
    }
}
