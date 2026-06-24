package com.edufinance.backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "progresso_usuario", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"usuario_id", "licao_id"})
})
public class ProgressoUsuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "usuario_id", nullable = false)
    private Long usuarioId;

    @Column(name = "licao_id", nullable = false)
    private Long licaoId;

    private boolean concluido = false;

    @Column(name = "concluido_em")
    private LocalDateTime concluidoEm;

    @Column(name = "criado_em")
    private LocalDateTime criadoEm = LocalDateTime.now();

    public ProgressoUsuario() {
    }

    public ProgressoUsuario(Long id, Long usuarioId, Long licaoId, boolean concluido, LocalDateTime concluidoEm, LocalDateTime criadoEm) {
        this.id = id;
        this.usuarioId = usuarioId;
        this.licaoId = licaoId;
        this.concluido = concluido;
        this.concluidoEm = concluidoEm;
        this.criadoEm = criadoEm;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getUsuarioId() {
        return usuarioId;
    }

    public void setUsuarioId(Long usuarioId) {
        this.usuarioId = usuarioId;
    }

    public Long getLicaoId() {
        return licaoId;
    }

    public void setLicaoId(Long licaoId) {
        this.licaoId = licaoId;
    }

    public boolean isConcluido() {
        return concluido;
    }

    public void setConcluido(boolean concluido) {
        this.concluido = concluido;
    }

    public LocalDateTime getConcluidoEm() {
        return concluidoEm;
    }

    public void setConcluidoEm(LocalDateTime concluidoEm) {
        this.concluidoEm = concluidoEm;
    }

    public LocalDateTime getCriadoEm() {
        return criadoEm;
    }

    public void setCriadoEm(LocalDateTime criadoEm) {
        this.criadoEm = criadoEm;
    }
}
