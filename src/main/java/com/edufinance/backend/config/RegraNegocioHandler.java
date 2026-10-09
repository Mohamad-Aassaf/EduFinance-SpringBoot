package com.edufinance.backend.config;

import com.edufinance.backend.service.RegraNegocioException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

// Devolve a mensagem como texto puro, igual aos demais controllers da API
@RestControllerAdvice
public class RegraNegocioHandler {

    @ExceptionHandler(RegraNegocioException.class)
    public ResponseEntity<String> tratar(RegraNegocioException e) {
        return ResponseEntity.status(e.getStatus()).body(e.getMessage());
    }
}
