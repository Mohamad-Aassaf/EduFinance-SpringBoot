package com.edufinance.backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "licoes")
public class Licao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String titulo;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String conteudo;

    @Column(columnDefinition = "TEXT")
    private String exemplo;

    @Column(nullable = false)
    private String modulo;

    @Column(name = "ordem_licao", nullable = false)
    private int ordemLicao;

    @Column(name = "criado_em")
    private LocalDateTime criadoEm = LocalDateTime.now();

    public Licao() {
    }

    public Licao(Long id, String titulo, String conteudo, String exemplo, String modulo, int ordemLicao, LocalDateTime criadoEm) {
        this.id = id;
        this.titulo = titulo;
        this.conteudo = conteudo;
        this.exemplo = exemplo;
        this.modulo = modulo;
        this.ordemLicao = ordemLicao;
        this.criadoEm = criadoEm;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTitulo() {
        return titulo;
    }

    public void setTitulo(String titulo) {
        this.titulo = titulo;
    }

    public String getConteudo() {
        return conteudo;
    }

    public void setConteudo(String conteudo) {
        this.conteudo = conteudo;
    }

    public String getExemplo() {
        return exemplo;
    }

    public void setExemplo(String exemplo) {
        this.exemplo = exemplo;
    }

    public String getModulo() {
        return modulo;
    }

    public void setModulo(String modulo) {
        this.modulo = modulo;
    }

    public int getOrdemLicao() {
        return ordemLicao;
    }

    public void setOrdemLicao(int ordemLicao) {
        this.ordemLicao = ordemLicao;
    }

    public LocalDateTime getCriadoEm() {
        return criadoEm;
    }

    public void setCriadoEm(LocalDateTime criadoEm) {
        this.criadoEm = criadoEm;
    }
}
