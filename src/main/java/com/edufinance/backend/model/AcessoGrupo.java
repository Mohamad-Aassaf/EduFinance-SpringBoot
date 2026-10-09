package com.edufinance.backend.model;

import com.edufinance.backend.service.RegraNegocioException;
import org.springframework.http.HttpStatus;

import java.util.Locale;

/**
 * Como se entra em um grupo:
 * - ABERTO:  público, aparece na busca e qualquer um entra
 * - SENHA:   aparece na busca, mas só entra com a senha (ou com o convite)
 * - CONVITE: privado, não aparece na busca e só entra com o código de convite
 */
public enum AcessoGrupo {
    ABERTO, SENHA, CONVITE;

    public static AcessoGrupo de(String valor) {
        if (valor == null || valor.isBlank()) {
            return ABERTO;
        }
        try {
            return valueOf(valor.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "Tipo de acesso inválido.");
        }
    }
}
