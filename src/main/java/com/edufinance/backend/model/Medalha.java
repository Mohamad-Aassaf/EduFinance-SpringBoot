package com.edufinance.backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "medalhas", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"usuario_id", "tipo_medalha"})
})
public class Medalha {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "usuario_id", nullable = false)
    private Long usuarioId;

    @Column(name = "tipo_medalha", nullable = false)
    private String tipoMedalha;

    @Column(name = "conquistado_em")
    private LocalDateTime conquistadoEm = LocalDateTime.now();

    public Medalha() {
    }

    public Medalha(Long id, Long usuarioId, String tipoMedalha, LocalDateTime conquistadoEm) {
        this.id = id;
        this.usuarioId = usuarioId;
        this.tipoMedalha = tipoMedalha;
        this.conquistadoEm = conquistadoEm;
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

    public String getTipoMedalha() {
        return tipoMedalha;
    }

    public void setTipoMedalha(String tipoMedalha) {
        this.tipoMedalha = tipoMedalha;
    }

    public LocalDateTime getConquistadoEm() {
        return conquistadoEm;
    }

    public void setConquistadoEm(LocalDateTime conquistadoEm) {
        this.conquistadoEm = conquistadoEm;
    }
}
