package com.edufinance.backend.controller;

import com.edufinance.backend.model.Perfil;
import com.edufinance.backend.repository.PerfilRepository;
import com.edufinance.backend.config.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired
    private PerfilRepository perfilRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    // Endpoint para cadastro
    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String password = request.get("password");
        String name = request.get("name");

        if (email == null || password == null || name == null) {
            return ResponseEntity.badRequest().body("Campos obrigatórios ausentes.");
        }

        if (perfilRepository.findByEmail(email).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("E-mail já cadastrado.");
        }

        Perfil novoPerfil = new Perfil();
        novoPerfil.setEmail(email);
        novoPerfil.setNome(name);
        novoPerfil.setSenha(passwordEncoder.encode(password));
        novoPerfil.setSaldoVirtual(100000.0);
        novoPerfil.setXp(0);
        novoPerfil.setNivel(1);
        novoPerfil.setCriadoEm(LocalDateTime.now());

        Perfil perfilSalvo = perfilRepository.save(novoPerfil);
        String token = jwtUtil.gerarToken(perfilSalvo.getEmail());

        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("perfil", perfilSalvo);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // Endpoint para login
    @PostMapping("/signin")
    public ResponseEntity<?> signin(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String password = request.get("password");

        if (email == null || password == null) {
            return ResponseEntity.badRequest().body("Campos obrigatórios ausentes.");
        }

        Optional<Perfil> perfilOpt = perfilRepository.findByEmail(email);
        if (perfilOpt.isEmpty() || !passwordEncoder.matches(password, perfilOpt.get().getSenha())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("E-mail ou senha incorretos.");
        }

        Perfil perfil = perfilOpt.get();
        String token = jwtUtil.gerarToken(perfil.getEmail());

        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("perfil", perfil);

        return ResponseEntity.ok(response);
    }

    // Solicita redefinição de senha (simula o envio do código)
    @PostMapping("/recuperar/solicitar")
    public ResponseEntity<?> solicitarRecuperacao(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        if (email == null || email.isEmpty()) {
            return ResponseEntity.badRequest().body("E-mail é obrigatório.");
        }

        Optional<Perfil> perfilOpt = perfilRepository.findByEmail(email);
        if (perfilOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("E-mail não cadastrado.");
        }

        Map<String, String> response = new HashMap<>();
        response.put("codigo", "1234");
        response.put("mensagem", "Código de recuperação enviado para seu e-mail (simulado). Use o código: 1234");
        return ResponseEntity.ok(response);
    }

    // Confirma a redefinição de senha com o código verificado
    @PostMapping("/recuperar/redefinir")
    public ResponseEntity<?> redefinirSenha(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String codigo = request.get("codigo");
        String novaSenha = request.get("novaSenha");

        if (email == null || codigo == null || novaSenha == null) {
            return ResponseEntity.badRequest().body("Campos obrigatórios ausentes.");
        }

        if (!"1234".equals(codigo)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Código de recuperação inválido.");
        }

        Optional<Perfil> perfilOpt = perfilRepository.findByEmail(email);
        if (perfilOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("E-mail não cadastrado.");
        }

        Perfil perfil = perfilOpt.get();
        perfil.setSenha(passwordEncoder.encode(novaSenha));
        perfilRepository.save(perfil);

        return ResponseEntity.ok(Map.of("mensagem", "Senha redefinida com sucesso!"));
    }
}
