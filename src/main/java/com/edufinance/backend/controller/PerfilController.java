package com.edufinance.backend.controller;

import com.edufinance.backend.model.Perfil;
import com.edufinance.backend.repository.PerfilRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/perfis")
@CrossOrigin(origins = "*")
public class PerfilController {

    @Autowired
    private PerfilRepository perfilRepository;

    @PostMapping("/login")
    public ResponseEntity<Perfil> login(@RequestBody Perfil loginRequest) {
        if (loginRequest.getEmail() == null || loginRequest.getEmail().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        
        Optional<Perfil> perfilExistente = perfilRepository.findByEmail(loginRequest.getEmail());
        if (perfilExistente.isPresent()) {
            return ResponseEntity.ok(perfilExistente.get());
        }

        Perfil novoPerfil = new Perfil();
        novoPerfil.setEmail(loginRequest.getEmail());
        
        if (loginRequest.getNome() != null && !loginRequest.getNome().isEmpty()) {
            novoPerfil.setNome(loginRequest.getNome());
        } else {
            novoPerfil.setNome("Estudante");
        }
        
        Perfil perfilSalvo = perfilRepository.save(novoPerfil);
        return ResponseEntity.ok(perfilSalvo);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Perfil> getPerfil(@PathVariable Long id) {
        Optional<Perfil> perfilOpt = perfilRepository.findById(id);
        if (perfilOpt.isPresent()) {
            return ResponseEntity.ok(perfilOpt.get());
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/ranking")
    public List<Perfil> getRanking() {
        return perfilRepository.findAllByOrderByXpDesc();
    }

    @PutMapping("/{id}/saldo")
    public ResponseEntity<Perfil> updateSaldo(@PathVariable Long id, @RequestParam double valor) {
        Optional<Perfil> perfilOpt = perfilRepository.findById(id);
        if (perfilOpt.isPresent()) {
            Perfil perfil = perfilOpt.get();
            perfil.setSaldoVirtual(valor);
            Perfil atualizado = perfilRepository.save(perfil);
            return ResponseEntity.ok(atualizado);
        } else {
            return ResponseEntity.notFound().build();
        }
    }
}
