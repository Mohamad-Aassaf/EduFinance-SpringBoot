package com.edufinance.backend.model;

import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.LocalDateTime;

@Entity
@Table(name = "grupo_membros", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"grupo_id", "perfil_id"})
})
public class GrupoMembro {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Chaves estrangeiras: o banco apaga a participação junto com o grupo ou o perfil
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "grupo_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private GrupoRanking grupo;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "perfil_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Perfil perfil;

    @Column(nullable = false, length = 20)
    private String papel = PapelGrupo.MEMBRO.name();

    @Column(name = "entrou_em")
    private LocalDateTime entrouEm = LocalDateTime.now();

    public GrupoMembro() {
    }

    public GrupoMembro(GrupoRanking grupo, Perfil perfil, PapelGrupo papel) {
        this.grupo = grupo;
        this.perfil = perfil;
        this.papel = papel.name();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public GrupoRanking getGrupo() {
        return grupo;
    }

    public Perfil getPerfil() {
        return perfil;
    }

    public PapelGrupo getPapel() {
        return PapelGrupo.valueOf(papel);
    }

    public void setPapel(PapelGrupo papel) {
        this.papel = papel.name();
    }

    public LocalDateTime getEntrouEm() {
        return entrouEm;
    }

    public void setEntrouEm(LocalDateTime entrouEm) {
        this.entrouEm = entrouEm;
    }
}
