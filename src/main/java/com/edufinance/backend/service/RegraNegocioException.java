package com.edufinance.backend.service;

import org.springframework.http.HttpStatus;

/**
 * Erro de regra de negócio com o status HTTP que deve voltar ao cliente.
 * A mensagem é mostrada ao usuário, então não deve conter dados internos.
 */
public class RegraNegocioException extends RuntimeException {

    private final HttpStatus status;

    public RegraNegocioException(HttpStatus status, String mensagem) {
        super(mensagem);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
