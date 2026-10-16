package com.edufinance.backend.model;

import jakarta.persistence.*;

// Configuração global da aplicação (chave/valor), válida para todos os usuários e mantida entre reinicializações
@Entity
@Table(name = "configuracoes_sistema")
public class ConfiguracaoSistema {

    @Id
    @Column(length = 100)
    private String chave;

    @Column(columnDefinition = "TEXT")
    private String valor;

    public ConfiguracaoSistema() {
    }

    public ConfiguracaoSistema(String chave, String valor) {
        this.chave = chave;
        this.valor = valor;
    }

    public String getChave() {
        return chave;
    }

    public void setChave(String chave) {
        this.chave = chave;
    }

    public String getValor() {
        return valor;
    }

    public void setValor(String valor) {
        this.valor = valor;
    }
}
