package com.edufinance.backend.model;

import com.edufinance.backend.service.RegraNegocioException;
import org.springframework.http.HttpStatus;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Escopos geográficos dos rankings públicos.
 * Cada escopo diz quais campos de localização do perfil ele compara;
 * para criar um novo escopo basta adicionar uma constante aqui.
 */
public enum EscopoRanking {
    GLOBAL(List.of()),
    PAIS(List.of("pais")),
    ESTADO(List.of("pais", "estado")),
    CIDADE(List.of("pais", "estado", "cidade"));

    private final List<String> campos;

    EscopoRanking(List<String> campos) {
        this.campos = campos;
    }

    public List<String> getCampos() {
        return campos;
    }

    /** Campos de localização que o perfil ainda não informou e que este escopo exige. */
    public List<String> camposFaltando(Perfil perfil) {
        List<String> faltando = new ArrayList<>();
        for (String campo : campos) {
            String valor = valorDoCampo(perfil, campo);
            if (valor == null || valor.isBlank()) {
                faltando.add(campo);
            }
        }
        return faltando;
    }

    public static String valorDoCampo(Perfil perfil, String campo) {
        return switch (campo) {
            case "pais" -> perfil.getPais();
            case "estado" -> perfil.getEstado();
            case "cidade" -> perfil.getCidade();
            default -> throw new IllegalArgumentException("Campo de localização desconhecido: " + campo);
        };
    }

    public static EscopoRanking de(String valor) {
        if (valor == null || valor.isBlank()) {
            return GLOBAL;
        }
        try {
            return valueOf(valor.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "Escopo de ranking inválido.");
        }
    }
}
