package com.edufinance.backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "simulacoes")
public class Simulacao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "usuario_id", nullable = false)
    private Long usuarioId;

    @Column(name = "tipo_investimento", nullable = false)
    private String tipoInvestimento;

    @Column(name = "valor_inicial", nullable = false)
    private double valorInicial;

    @Column(name = "aporte_mensal", nullable = false)
    private double aporteMensal;

    @Column(name = "taxa_anual", nullable = false)
    private double taxaAnual;

    @Column(name = "tempo_meses", nullable = false)
    private int tempoMeses;

    @Column(name = "valor_final", nullable = false)
    private double valorFinal;

    @Column(name = "criado_em")
    private LocalDateTime criadoEm = LocalDateTime.now();

    public Simulacao() {
    }

    public Simulacao(Long id, Long usuarioId, String tipoInvestimento, double valorInicial, double aporteMensal, double taxaAnual, int tempoMeses, double valorFinal, LocalDateTime criadoEm) {
        this.id = id;
        this.usuarioId = usuarioId;
        this.tipoInvestimento = tipoInvestimento;
        this.valorInicial = valorInicial;
        this.aporteMensal = aporteMensal;
        this.taxaAnual = taxaAnual;
        this.tempoMeses = tempoMeses;
        this.valorFinal = valorFinal;
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

    public String getTipoInvestimento() {
        return tipoInvestimento;
    }

    public void setTipoInvestimento(String tipoInvestimento) {
        this.tipoInvestimento = tipoInvestimento;
    }

    public double getValorInicial() {
        return valorInicial;
    }

    public void setValorInicial(double valorInicial) {
        this.valorInicial = valorInicial;
    }

    public double getAporteMensal() {
        return aporteMensal;
    }

    public void setAporteMensal(double aporteMensal) {
        this.aporteMensal = aporteMensal;
    }

    public double getTaxaAnual() {
        return taxaAnual;
    }

    public void setTaxaAnual(double taxaAnual) {
        this.taxaAnual = taxaAnual;
    }

    public int getTempoMeses() {
        return tempoMeses;
    }

    public void setTempoMeses(int tempoMeses) {
        this.tempoMeses = tempoMeses;
    }

    public double getValorFinal() {
        return valorFinal;
    }

    public void setValorFinal(double valorFinal) {
        this.valorFinal = valorFinal;
    }

    public LocalDateTime getCriadoEm() {
        return criadoEm;
    }

    public void setCriadoEm(LocalDateTime criadoEm) {
        this.criadoEm = criadoEm;
    }
}
