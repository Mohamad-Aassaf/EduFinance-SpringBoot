package com.edufinance.backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "grupos_ranking")
public class GrupoRanking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 60)
    private String nome;

    @Column(length = 280)
    private String descricao;

    @Column(nullable = false, length = 20)
    private String icone = "trophy";

    // Guardados como texto para que novos valores não exijam alterar o banco
    @Column(nullable = false, length = 20)
    private String acesso = AcessoGrupo.ABERTO.name();

    @Column(nullable = false, length = 20)
    private String metrica = MetricaRanking.XP.name();

    // Hash BCrypt da senha do grupo. Nunca sai da API.
    @Column(name = "senha_hash")
    private String senhaHash;

    @Column(name = "codigo_convite", nullable = false, unique = true, length = 12)
    private String codigoConvite;

    @Column(name = "criador_id", nullable = false)
    private Long criadorId;

    @Column(name = "criado_em")
    private LocalDateTime criadoEm = LocalDateTime.now();

    public GrupoRanking() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public String getDescricao() {
        return descricao;
    }

    public void setDescricao(String descricao) {
        this.descricao = descricao;
    }

    public String getIcone() {
        return icone;
    }

    public void setIcone(String icone) {
        this.icone = icone;
    }

    public AcessoGrupo getAcesso() {
        return AcessoGrupo.valueOf(acesso);
    }

    public void setAcesso(AcessoGrupo acesso) {
        this.acesso = acesso.name();
    }

    public MetricaRanking getMetrica() {
        return MetricaRanking.valueOf(metrica);
    }

    public void setMetrica(MetricaRanking metrica) {
        this.metrica = metrica.name();
    }

    public String getSenhaHash() {
        return senhaHash;
    }

    public void setSenhaHash(String senhaHash) {
        this.senhaHash = senhaHash;
    }

    public String getCodigoConvite() {
        return codigoConvite;
    }

    public void setCodigoConvite(String codigoConvite) {
        this.codigoConvite = codigoConvite;
    }

    public Long getCriadorId() {
        return criadorId;
    }

    public void setCriadorId(Long criadorId) {
        this.criadorId = criadorId;
    }

    public LocalDateTime getCriadoEm() {
        return criadoEm;
    }

    public void setCriadoEm(LocalDateTime criadoEm) {
        this.criadoEm = criadoEm;
    }
}
