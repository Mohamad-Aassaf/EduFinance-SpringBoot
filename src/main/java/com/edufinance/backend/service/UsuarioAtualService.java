package com.edufinance.backend.service;

import com.edufinance.backend.model.Perfil;
import com.edufinance.backend.repository.PerfilRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

// Resolve o perfil do usuário autenticado a partir do token JWT da requisição
@Service
public class UsuarioAtualService {

    @Autowired
    private PerfilRepository perfilRepository;

    public Perfil exigir() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof UserDetails detalhes)) {
            throw new RegraNegocioException(HttpStatus.UNAUTHORIZED, "Sessão expirada. Entre novamente.");
        }
        return perfilRepository.findByEmail(detalhes.getUsername())
                .orElseThrow(() -> new RegraNegocioException(HttpStatus.UNAUTHORIZED, "Sessão expirada. Entre novamente."));
    }
}
