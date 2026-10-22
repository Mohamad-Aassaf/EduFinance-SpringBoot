package com.edufinance.backend.controller;

import com.edufinance.backend.config.JwtUtil;
import com.edufinance.backend.model.ChaveDigital;
import com.edufinance.backend.model.Perfil;
import com.edufinance.backend.repository.PerfilRepository;
import com.edufinance.backend.service.AssinaturaService;
import com.edufinance.backend.service.OfensivaService;
import com.edufinance.backend.service.RegraNegocioException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Login com a chave digital, sem senha (desafio e resposta):
 * 1. O navegador pede um desafio para o e-mail que está no arquivo da chave.
 * 2. O servidor devolve um texto aleatório, válido por 2 minutos e de uso único.
 * 3. O navegador assina o texto com a chave privada e devolve a assinatura.
 * 4. Se ela confere com a chave ativa da conta, o servidor emite o token normalmente.
 *
 * O texto sempre começa com "EduFinance login", então uma assinatura de login nunca
 * serve como assinatura de outra operação (que é um JSON).
 */
@RestController
@RequestMapping("/api/auth/chave")
@CrossOrigin(origins = "*")
public class LoginChaveController {

    private static final long VALIDADE_SEGUNDOS = 120;
    private static final SecureRandom ALEATORIO = new SecureRandom();

    private record Desafio(String email, String mensagem, Instant expiraEm) {
    }

    private final Map<String, Desafio> desafios = new ConcurrentHashMap<>();

    @Autowired
    private PerfilRepository perfilRepository;

    @Autowired
    private AssinaturaService assinaturaService;

    @Autowired
    private OfensivaService ofensivaService;

    @Autowired
    private JwtUtil jwtUtil;

    @PostMapping("/desafio")
    public Map<String, Object> criarDesafio(@RequestBody Map<String, String> corpo) {
        desafios.values().removeIf(d -> d.expiraEm().isBefore(Instant.now()));

        String email = Objects.toString(corpo.get("email"), "");
        Optional<Perfil> perfil = perfilRepository.findByEmail(email);
        if (perfil.isEmpty() || assinaturaService.chaveAtivaDoUsuario(perfil.get().getId()).isEmpty()) {
            throw new RegraNegocioException(HttpStatus.BAD_REQUEST,
                    "Não é possível entrar com essa chave. Ela pode ter sido revogada ou ainda não aprovada.");
        }

        byte[] aleatorio = new byte[32];
        ALEATORIO.nextBytes(aleatorio);
        String id = UUID.randomUUID().toString();
        Instant expiraEm = Instant.now().plusSeconds(VALIDADE_SEGUNDOS);
        String mensagem = "EduFinance login\n" + email + "\n" + Base64.getEncoder().encodeToString(aleatorio) + "\n" + expiraEm;
        desafios.put(id, new Desafio(email, mensagem, expiraEm));
        return Map.of("desafioId", id, "mensagem", mensagem);
    }

    @PostMapping("/entrar")
    public Map<String, Object> entrar(@RequestBody Map<String, String> corpo) {
        Desafio desafio = desafios.remove(Objects.toString(corpo.get("desafioId"), ""));
        if (desafio == null || desafio.expiraEm().isBefore(Instant.now())) {
            throw new RegraNegocioException(HttpStatus.UNAUTHORIZED, "O desafio expirou. Tente entrar de novo.");
        }

        Perfil perfil = perfilRepository.findByEmail(desafio.email())
                .orElseThrow(() -> new RegraNegocioException(HttpStatus.UNAUTHORIZED, "Conta não encontrada."));
        ChaveDigital chave = assinaturaService.chaveAtivaDoUsuario(perfil.getId())
                .orElseThrow(() -> new RegraNegocioException(HttpStatus.UNAUTHORIZED, "A conta não tem chave ativa."));
        if (!assinaturaService.assinaturaConfere(chave.getChavePublica(), desafio.mensagem(), corpo.get("assinatura"))) {
            throw new RegraNegocioException(HttpStatus.UNAUTHORIZED,
                    "Essa não é a chave ativa da conta. Ela pode ter sido revogada.");
        }

        Perfil atualizado = ofensivaService.registrarAcesso(perfil);
        Map<String, Object> resposta = new HashMap<>();
        resposta.put("token", jwtUtil.gerarToken(atualizado.getEmail()));
        resposta.put("perfil", atualizado);
        return resposta;
    }
}
