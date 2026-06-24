package com.edufinance.backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "perguntas")
public class Pergunta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "licao_id", nullable = false)
    private Long licaoId;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String pergunta;

    @Column(name = "opcao_a", nullable = false)
    private String opcaoA;

    @Column(name = "opcao_b", nullable = false)
    private String opcaoB;

    @Column(name = "opcao_c", nullable = false)
    private String opcaoC;

    @Column(name = "opcao_d", nullable = false)
    private String opcaoD;

    @Column(name = "resposta_correta", nullable = false)
    private int respostaCorreta;

    @Column(columnDefinition = "TEXT")
    private String explicacao;

    @Column(name = "criado_em")
    private LocalDateTime criadoEm = LocalDateTime.now();

    public Pergunta() {
    }

    public Pergunta(Long id, Long licaoId, String pergunta, String opcaoA, String opcaoB, String opcaoC, String opcaoD, int respostaCorreta, String explicacao, LocalDateTime criadoEm) {
        this.id = id;
        this.licaoId = licaoId;
        this.pergunta = pergunta;
        this.opcaoA = opcaoA;
        this.opcaoB = opcaoB;
        this.opcaoC = opcaoC;
        this.opcaoD = opcaoD;
        this.respostaCorreta = respostaCorreta;
        this.explicacao = explicacao;
        this.criadoEm = criadoEm;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getLicaoId() {
        return licaoId;
    }

    public void setLicaoId(Long licaoId) {
        this.licaoId = licaoId;
    }

    public String getPergunta() {
        return pergunta;
    }

    public void setPergunta(String pergunta) {
        this.pergunta = pergunta;
    }

    public String getOpcaoA() {
        return opcaoA;
    }

    public void setOpcaoA(String opcaoA) {
        this.opcaoA = opcaoA;
    }

    public String getOpcaoB() {
        return opcaoB;
    }

    public void setOpcaoB(String opcaoB) {
        this.opcaoB = opcaoB;
    }

    public String getOpcaoC() {
        return opcaoC;
    }

    public void setOpcaoC(String opcaoC) {
        this.opcaoC = opcaoC;
    }

    public String getOpcaoD() {
        return opcaoD;
    }

    public void setOpcaoD(String opcaoD) {
        this.opcaoD = opcaoD;
    }

    public int getRespostaCorreta() {
        return respostaCorreta;
    }

    public void setRespostaCorreta(int respostaCorreta) {
        this.respostaCorreta = respostaCorreta;
    }

    public String getExplicacao() {
        return explicacao;
    }

    public void setExplicacao(String explicacao) {
        this.explicacao = explicacao;
    }

    public LocalDateTime getCriadoEm() {
        return criadoEm;
    }

    public void setCriadoEm(LocalDateTime criadoEm) {
        this.criadoEm = criadoEm;
    }
}
