package com.edufinance.backend.config;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;

@Component
public class JwtUtil {

    // Gerando uma chave secreta dinâmica e segura ao iniciar a aplicação
    private final Key key = Keys.secretKeyFor(SignatureAlgorithm.HS256);
    private final long expirationTime = 1000 * 60 * 60 * 24; // Validade de 24 horas

    // Gera um token JWT usando o e-mail do usuário como Subject
    public String gerarToken(String email) {
        return Jwts.builder()
                .setSubject(email)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + expirationTime))
                .signWith(key)
                .compact();
    }

    // Extrai o e-mail (subject) de um token JWT
    public String extrairEmail(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody()
                .getSubject();
    }

    // Valida se o token pertence ao e-mail informado e se ainda é válido
    public boolean validarToken(String token, String email) {
        try {
            String emailToken = extrairEmail(token);
            return emailToken.equals(email) && !isExpirado(token);
        } catch (Exception e) {
            return false;
        }
    }

    // Verifica se o token já expirou
    private boolean isExpirado(String token) {
        Date expiracao = Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody()
                .getExpiration();
        return expiracao.before(new Date());
    }
}
