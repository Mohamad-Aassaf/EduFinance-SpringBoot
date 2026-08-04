package com.edufinance.backend.service;

import com.edufinance.backend.model.Perfil;
import com.edufinance.backend.repository.PerfilRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Collections;

@Service
public class UserDetailsServiceImpl implements UserDetailsService {

    @Autowired
    private PerfilRepository perfilRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        Perfil perfil = perfilRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("Usuário não encontrado com o e-mail: " + email));

        // Retorna o objeto User do Spring Security com as informações do perfil
        return new User(
                perfil.getEmail(),
                perfil.getSenha() != null ? perfil.getSenha() : "", // Caso senha seja nula para seeds legados
                Collections.emptyList() // Lista vazia de permissões (sem roles específicas necessárias)
        );
    }
}
