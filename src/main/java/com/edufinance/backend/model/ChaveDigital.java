package com.edufinance.backend.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

/**
 * Chave pública Ed25519 de um usuário (ou do administrador).
 *
 * A chave privada correspondente nunca chega ao servidor: ela fica no arquivo
 * que a pessoa guarda (no pendrive, por exemplo) e é usada só no navegador para
 * assinar as ações. Aqui guardamos apenas a parte pública, que serve para
 * conferir essas assinaturas.
 *
 * Status:
 * - ATIVA: em uso. No máximo uma por usuário (e uma do administrador).
 * - PENDENTE: chave nova de quem já teve outra; espera aprovação do administrador.
 * - REVOGADA: não vale mais. Registros assinados antes da revogação continuam válidos.
 */
@Entity
@Table(name = "chaves_digitais")
public class ChaveDigital {

    public static final String TIPO_USUARIO = "USUARIO";
    public static final String TIPO_ADMIN = "ADMIN";

    public static final String ATIVA = "ATIVA";
    public static final String PENDENTE = "PENDENTE";
    public static final String REVOGADA = "REVOGADA";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Dono da chave; fica vazio na chave do administrador
    @Column(name = "usuario_id")
    private Long usuarioId;

    @Column(nullable = false, length = 10)
    private String tipo;

    // 32 bytes da chave pública Ed25519, em Base64
    @Column(name = "chave_publica", nullable = false, unique = true, length = 64)
    private String chavePublica;

    @Column(nullable = false, length = 10)
    private String status;

    @Column(name = "criada_em", nullable = false)
    private LocalDateTime criadaEm = LocalDateTime.now();

    @Column(name = "ativada_em")
    private LocalDateTime ativadaEm;

    @Column(name = "revogada_em")
    private LocalDateTime revogadaEm;

    @Column(name = "motivo_revogacao", length = 120)
    private String motivoRevogacao;

    public ChaveDigital() {
    }

    public ChaveDigital(Long usuarioId, String tipo, String chavePublica, String status) {
        this.usuarioId = usuarioId;
        this.tipo = tipo;
        this.chavePublica = chavePublica;
        this.status = status;
        if (ATIVA.equals(status)) {
            this.ativadaEm = this.criadaEm;
        }
    }

    public void ativar() {
        this.status = ATIVA;
        this.ativadaEm = LocalDateTime.now();
    }

    public void revogar(String motivo) {
        this.status = REVOGADA;
        this.revogadaEm = LocalDateTime.now();
        this.motivoRevogacao = motivo;
    }

    public Long getId() {
        return id;
    }

    public Long getUsuarioId() {
        return usuarioId;
    }

    public String getTipo() {
        return tipo;
    }

    public String getChavePublica() {
        return chavePublica;
    }

    public String getStatus() {
        return status;
    }

    public LocalDateTime getCriadaEm() {
        return criadaEm;
    }

    public LocalDateTime getAtivadaEm() {
        return ativadaEm;
    }

    public LocalDateTime getRevogadaEm() {
        return revogadaEm;
    }

    public String getMotivoRevogacao() {
        return motivoRevogacao;
    }
}
