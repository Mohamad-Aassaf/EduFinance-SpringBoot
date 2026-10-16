package com.edufinance.backend.model;

import jakarta.persistence.*;

/**
 * Foto de perfil de um usuário, guardada no banco.
 *
 * Fica numa tabela separada para o perfil continuar leve: listas como o ranking
 * carregam só o endereço da foto (avatarUrl), e a imagem é baixada à parte.
 */
@Entity
@Table(name = "fotos_perfil")
public class FotoPerfil {

    @Id
    @Column(name = "perfil_id")
    private Long perfilId;

    @Column(name = "tipo", nullable = false, length = 20)
    private String tipo; // image/jpeg, image/png ou image/webp

    @Column(name = "dados", nullable = false)
    private byte[] dados;

    public FotoPerfil() {
    }

    public FotoPerfil(Long perfilId, String tipo, byte[] dados) {
        this.perfilId = perfilId;
        this.tipo = tipo;
        this.dados = dados;
    }

    public Long getPerfilId() {
        return perfilId;
    }

    public String getTipo() {
        return tipo;
    }

    public byte[] getDados() {
        return dados;
    }
}
