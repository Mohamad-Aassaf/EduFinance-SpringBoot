package com.edufinance.backend.model;

import com.edufinance.backend.service.RegraNegocioException;
import org.springframework.http.HttpStatus;

import java.util.Locale;

/**
 * Métricas de pontuação disponíveis nos rankings.
 * Cada uma aponta para um dado já persistido no perfil do usuário.
 */
public enum MetricaRanking {
    XP("p.xp"),
    SALDO("COALESCE(p.saldo_virtual, 0)");

    // Expressão SQL usada na ordenação. Vem sempre daqui, nunca da requisição.
    private final String expressaoSql;

    MetricaRanking(String expressaoSql) {
        this.expressaoSql = expressaoSql;
    }

    public String getExpressaoSql() {
        return expressaoSql;
    }

    public static MetricaRanking de(String valor) {
        if (valor == null || valor.isBlank()) {
            return XP;
        }
        try {
            return valueOf(valor.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "Métrica de ranking inválida.");
        }
    }
}
