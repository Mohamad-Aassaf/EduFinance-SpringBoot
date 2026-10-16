package com.edufinance.backend.service;

import com.edufinance.backend.model.Licao;
import com.edufinance.backend.model.Pergunta;
import com.edufinance.backend.repository.LicaoRepository;
import com.edufinance.backend.repository.PerguntaRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.time.LocalDateTime;

/**
 * Cadastra na trilha as aulas e perguntas de trilha-extra.json (módulos Economia Global
 * e Criptomoedas), convertidas dos arquivos .sql da pasta base-conhecimento.
 *
 * Roda a cada inicialização, mas só insere as aulas cujo título ainda não existe,
 * então funciona tanto em banco novo quanto em banco já populado.
 */
@Service
public class TrilhaExtraSeeder {

    private final LicaoRepository licaoRepository;
    private final PerguntaRepository perguntaRepository;

    public TrilhaExtraSeeder(LicaoRepository licaoRepository, PerguntaRepository perguntaRepository) {
        this.licaoRepository = licaoRepository;
        this.perguntaRepository = perguntaRepository;
    }

    public void importar() {
        int novas = 0;
        try (InputStream json = new ClassPathResource("trilha-extra.json").getInputStream()) {
            for (JsonNode aula : new ObjectMapper().readTree(json)) {
                String titulo = aula.get("titulo").asText();
                if (licaoRepository.existsByTitulo(titulo)) {
                    continue;
                }

                Licao licao = new Licao();
                licao.setTitulo(titulo);
                licao.setConteudo(aula.get("conteudo").asText());
                licao.setExemplo(aula.get("exemplo").asText());
                licao.setModulo(aula.get("modulo").asText());
                licao.setOrdemLicao(aula.get("ordem").asInt());
                licao.setCriadoEm(LocalDateTime.now());
                licao = licaoRepository.save(licao);

                for (JsonNode p : aula.get("perguntas")) {
                    JsonNode opcoes = p.get("opcoes");
                    Pergunta pergunta = new Pergunta();
                    pergunta.setLicaoId(licao.getId());
                    pergunta.setPergunta(p.get("pergunta").asText());
                    pergunta.setOpcaoA(opcoes.get(0).asText());
                    pergunta.setOpcaoB(opcoes.get(1).asText());
                    pergunta.setOpcaoC(opcoes.get(2).asText());
                    pergunta.setOpcaoD(opcoes.get(3).asText());
                    pergunta.setRespostaCorreta(p.get("respostaCorreta").asInt());
                    pergunta.setExplicacao(p.get("explicacao").asText());
                    pergunta.setCriadoEm(LocalDateTime.now());
                    perguntaRepository.save(pergunta);
                }
                novas++;
            }
        } catch (Exception e) {
            System.err.println("Não foi possível importar as aulas extras da trilha: " + e.getMessage());
        }
        if (novas > 0) {
            System.out.println("Trilha: " + novas + " aulas novas cadastradas (Economia Global e Criptomoedas).");
        }
    }
}
