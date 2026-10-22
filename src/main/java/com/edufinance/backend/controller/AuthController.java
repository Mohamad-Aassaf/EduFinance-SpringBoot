package com.edufinance.backend.controller;

import com.edufinance.backend.model.Perfil;
import com.edufinance.backend.service.AssinaturaService;
import com.edufinance.backend.service.OfensivaService;
import com.edufinance.backend.service.RecuperacaoSenhaService;
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
    private OfensivaService ofensivaService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private AssinaturaService assinaturaService;

    @Autowired
    private RecuperacaoSenhaService recuperacaoSenhaService;

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

        Perfil perfilSalvo = ofensivaService.registrarAcesso(perfilRepository.save(novoPerfil));
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

        // Quem ligou "exigir a chave para entrar" só entra pelo login com chave digital
        Perfil encontrado = perfilOpt.get();
        if (encontrado.isExigirChaveLogin() && assinaturaService.chaveAtivaDoUsuario(encontrado.getId()).isPresent()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Esta conta só entra com a chave digital. Use \"Entrar com chave digital\".");
        }

        Perfil perfil = ofensivaService.registrarAcesso(encontrado);
        String token = jwtUtil.gerarToken(perfil.getEmail());

        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("perfil", perfil);

        return ResponseEntity.ok(response);
    }

    /*
     * Solicita redefinição de senha. Gera um código aleatório (ver RecuperacaoSenhaService), que
     * NÃO volta na resposta: ele chega à pessoa pelo administrador, simulando o e-mail.
     * A resposta é a mesma exista ou não a conta, para não revelar quais e-mails estão cadastrados.
     */
    @PostMapping("/recuperar/solicitar")
    public ResponseEntity<?> solicitarRecuperacao(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        if (email == null || email.isEmpty()) {
            return ResponseEntity.badRequest().body("E-mail é obrigatório.");
        }

        if (perfilRepository.findByEmail(email).isPresent()) {
            recuperacaoSenhaService.criarPedido(email);
        }

        return ResponseEntity.ok(Map.of("mensagem",
                "Se o e-mail estiver cadastrado, um código de 6 dígitos foi gerado. Peça-o ao administrador do EduFinance (simulação do e-mail)."));
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

        if (novaSenha.length() < 6) {
            return ResponseEntity.badRequest().body("A nova senha precisa ter pelo menos 6 caracteres.");
        }

        recuperacaoSenhaService.consumirCodigo(email, codigo);

        Optional<Perfil> perfilOpt = perfilRepository.findByEmail(email);
        if (perfilOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Código inválido ou expirado. Peça um novo.");
        }

        Perfil perfil = perfilOpt.get();
        perfil.setSenha(passwordEncoder.encode(novaSenha));
        perfilRepository.save(perfil);

        return ResponseEntity.ok(Map.of("mensagem", "Senha redefinida com sucesso!"));
    }
}
