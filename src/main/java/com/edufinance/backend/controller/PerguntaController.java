package com.edufinance.backend.controller;

import com.edufinance.backend.model.Medalha;
import com.edufinance.backend.model.Perfil;
import com.edufinance.backend.model.Pergunta;
import com.edufinance.backend.model.ProgressoUsuario;
import com.edufinance.backend.repository.MedalhaRepository;
import com.edufinance.backend.repository.PerfilRepository;
import com.edufinance.backend.repository.PerguntaRepository;
import com.edufinance.backend.repository.ProgressoUsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/perguntas")
@CrossOrigin(origins = "*")
public class PerguntaController {

    @Autowired
    private PerguntaRepository perguntaRepository;

    @Autowired
    private PerfilRepository perfilRepository;

    @Autowired
    private ProgressoUsuarioRepository progressoUsuarioRepository;

    @Autowired
    private MedalhaRepository medalhaRepository;

    @GetMapping("/licao/{licaoId}")
    public List<Pergunta> getPerguntasPorLicao(@PathVariable Long licaoId) {
        return perguntaRepository.findByLicaoId(licaoId);
    }

    @PostMapping("/{perguntaId}/enviar")
    public ResponseEntity<Map<String, Object>> responderPergunta(
            @PathVariable Long perguntaId,
            @RequestBody Map<String, Object> payload) {
        
        Optional<Pergunta> perguntaOpt = perguntaRepository.findById(perguntaId);
        if (perguntaOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        
        Pergunta pergunta = perguntaOpt.get();
        Long usuarioId = Long.valueOf(payload.get("usuarioId").toString());
        int opcaoSelecionada = Integer.parseInt(payload.get("opcaoSelecionada").toString());

        Optional<Perfil> perfilOpt = perfilRepository.findById(usuarioId);
        if (perfilOpt.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        Perfil perfil = perfilOpt.get();
        Map<String, Object> response = new HashMap<>();
        
        boolean isCorreto = pergunta.getRespostaCorreta() == opcaoSelecionada;
        response.put("correto", isCorreto);
        response.put("explicacao", pergunta.getExplicacao());

        if (isCorreto) {
            int xpGanho = 20;
            response.put("xpGanho", xpGanho);
            
            int nivelAntigo = perfil.getNivel();
            int novoXp = perfil.getXp() + xpGanho;
            perfil.setXp(novoXp);
            
            int novoNivel = (novoXp / 100) + 1;
            perfil.setNivel(novoNivel);
            
            boolean subiuNivel = novoNivel > nivelAntigo;
            response.put("subiuNivel", subiuNivel);
            
            perfilRepository.save(perfil);

            Optional<ProgressoUsuario> progressoOpt = progressoUsuarioRepository.findByUsuarioIdAndLicaoId(perfil.getId(), pergunta.getLicaoId());
            if (progressoOpt.isEmpty()) {
                ProgressoUsuario progresso = new ProgressoUsuario();
                progresso.setUsuarioId(perfil.getId());
                progresso.setLicaoId(pergunta.getLicaoId());
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

            List<String> medalhasDesbloqueadas = new ArrayList<>();
            long aulasConcluidas = progressoUsuarioRepository.countByUsuarioIdAndConcluidoTrue(perfil.getId());

            if (aulasConcluidas >= 1) {
                desbloquearMedalha(perfil.getId(), "Primeira Aula", medalhasDesbloqueadas);
            }
            if (aulasConcluidas >= 5) {
                desbloquearMedalha(perfil.getId(), "Mestre das Finanças", medalhasDesbloqueadas);
            }
            if (perfil.getXp() >= 100) {
                desbloquearMedalha(perfil.getId(), "Investidor Bronze", medalhasDesbloqueadas);
            }

            response.put("medalhasDesbloqueadas", medalhasDesbloqueadas);
            response.put("xpAtual", perfil.getXp());
            response.put("nivelAtual", perfil.getNivel());
        } else {
            response.put("xpGanho", 0);
            response.put("xpAtual", perfil.getXp());
            response.put("nivelAtual", perfil.getNivel());
            response.put("subiuNivel", false);
            response.put("medalhasDesbloqueadas", new ArrayList<String>());
        }

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
