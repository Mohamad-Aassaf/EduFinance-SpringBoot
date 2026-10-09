package com.edufinance.backend.model;

import com.edufinance.backend.service.RegraNegocioException;
import org.springframework.http.HttpStatus;

import java.util.Locale;

public enum PapelGrupo {
    ADMIN, MEMBRO;

    public static PapelGrupo de(String valor) {
        try {
            return valueOf(String.valueOf(valor).trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "Papel inválido.");
        }
    }
}
