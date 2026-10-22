package com.edufinance.backend.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

/**
 * Um bloco da corrente de registros: uma ação importante (compra, venda, aula
 * concluída, ação do administrador, troca de chave), guardada exatamente como foi
 * assinada.
 *
 * Cada registro guarda o hash do anterior (hashAnterior) e o próprio hash, calculado
 * sobre o conteúdo. Alterar ou apagar um registro antigo quebra a corrente dali em
 * diante. O hashAnterior é único, então duas gravações simultâneas não conseguem
 * criar um "galho" na corrente: a segunda falha e é refeita pelo usuário.
 */
@Entity
@Table(name = "registros_assinados")
public class RegistroAssinado {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Usuário a quem o registro se refere (nas ações do admin, o usuário afetado)
    @Column(name = "usuario_id")
    private Long usuarioId;

    // Chave que assinou; vazio quando a ação foi feita sem assinatura
    @Column(name = "chave_id")
    private Long chaveId;

    @Column(nullable = false, length = 40)
    private String tipo;

    // Texto exato que foi assinado (JSON)
    @Column(nullable = false, columnDefinition = "text")
    private String payload;

    // Assinatura Ed25519 do payload, em Base64
    @Column(length = 100)
    private String assinatura;

    // Número crescente por chave, contra reenvio de uma assinatura antiga
    private Long sequencia;

    // O que o registro descreve no resto do banco, ex.: "transacao:12", "licao:5"
    @Column(length = 60)
    private String referencia;

    @Column(name = "hash_anterior", nullable = false, unique = true, length = 64)
    private String hashAnterior;

    @Column(nullable = false, length = 64)
    private String hash;

    @Column(name = "criado_em", nullable = false)
    private LocalDateTime criadoEm = LocalDateTime.now();

    public RegistroAssinado() {
    }

    public RegistroAssinado(Long usuarioId, Long chaveId, String tipo, String payload, String assinatura,
                            Long sequencia, String referencia) {
        this.usuarioId = usuarioId;
        this.chaveId = chaveId;
        this.tipo = tipo;
        this.payload = payload;
        this.assinatura = assinatura;
        this.sequencia = sequencia;
        this.referencia = referencia;
    }

    public Long getId() {
        return id;
    }

    public Long getUsuarioId() {
        return usuarioId;
    }

    public Long getChaveId() {
        return chaveId;
    }

    public String getTipo() {
        return tipo;
    }

    public String getPayload() {
        return payload;
    }

    public String getAssinatura() {
        return assinatura;
    }

    public Long getSequencia() {
        return sequencia;
    }

    public String getReferencia() {
        return referencia;
    }

    public String getHashAnterior() {
        return hashAnterior;
    }

    public void setHashAnterior(String hashAnterior) {
        this.hashAnterior = hashAnterior;
    }

    public String getHash() {
        return hash;
    }

    public void setHash(String hash) {
        this.hash = hash;
    }

    public LocalDateTime getCriadoEm() {
        return criadoEm;
    }
}
