package com.edufinance.backend.controller;

import com.edufinance.backend.model.Licao;
import com.edufinance.backend.model.ProgressoUsuario;
import com.edufinance.backend.repository.LicaoRepository;
import com.edufinance.backend.repository.ProgressoUsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/licoes")
@CrossOrigin(origins = "*")
public class LicaoController {

    @Autowired
    private LicaoRepository licaoRepository;

    @Autowired
    private ProgressoUsuarioRepository progressoUsuarioRepository;

    @GetMapping("/modulos")
    public List<String> getModulos() {
        List<Licao> todasLicoes = licaoRepository.findAll();
        List<String> modulos = new ArrayList<>();
        for (Licao licao : todasLicoes) {
            if (!modulos.contains(licao.getModulo())) {
                modulos.add(licao.getModulo());
            }
        }
        return modulos;
    }

    @GetMapping("/modulo/{modulo}")
    public List<Licao> getLicoesPorModulo(@PathVariable String modulo) {
        return licaoRepository.findByModulo(modulo);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Licao> getLicao(@PathVariable Long id) {
        Optional<Licao> licaoOpt = licaoRepository.findById(id);
        if (licaoOpt.isPresent()) {
            return ResponseEntity.ok(licaoOpt.get());
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/usuario/{usuarioId}/progresso")
    public List<ProgressoUsuario> getProgressoUsuario(@PathVariable Long usuarioId) {
        return progressoUsuarioRepository.findByUsuarioId(usuarioId);
    }
}
