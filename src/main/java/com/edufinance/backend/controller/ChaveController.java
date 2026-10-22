package com.edufinance.backend.controller;

import com.edufinance.backend.model.ChaveDigital;
import com.edufinance.backend.model.Perfil;
import com.edufinance.backend.repository.ChaveDigitalRepository;
import com.edufinance.backend.service.AssinaturaService;
import com.edufinance.backend.service.IntegridadeService;
import com.edufinance.backend.service.RegraNegocioException;
import com.edufinance.backend.service.UsuarioAtualService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.Duration;
import java.util.*;

/**
 * Chave digital do usuário logado.
 *
 * A primeira chave de uma conta já nasce ativa. Quem já teve uma chave (perdeu o arquivo,
 * por exemplo) cadastra uma nova que fica pendente até o administrador aprovar: assim,
 * quem descobrir a senha da conta não consegue trocar a chave sozinho.
 */
@RestController
@CrossOrigin(origins = "*")
public class ChaveController {

    @Autowired
    private ChaveDigitalRepository chaveRepository;

    @Autowired
    private AssinaturaService assinaturaService;

    @Autowired
    private IntegridadeService integridadeService;

    @Autowired
    private UsuarioAtualService usuarioAtual;

    @Autowired
    private PasswordEncoder passwordEncoder;

    /** Situação da chave: a ativa (ou pendente), a última sequência usada e o histórico. */
    @GetMapping("/api/chaves/me")
    public Map<String, Object> minhaChave() {
        Perfil perfil = usuarioAtual.exigir();
        List<ChaveDigital> historico = chaveRepository.findByUsuarioIdOrderByCriadaEmDesc(perfil.getId());
        ChaveDigital atual = historico.stream().filter(c -> ChaveDigital.ATIVA.equals(c.getStatus())).findFirst()
                .or(() -> historico.stream().filter(c -> ChaveDigital.PENDENTE.equals(c.getStatus())).findFirst())
                .orElse(null);

        Map<String, Object> resposta = new LinkedHashMap<>();
        resposta.put("chave", atual);
        resposta.put("ultimaSequencia", atual == null ? 0 : assinaturaService.ultimaSequencia(atual));
        resposta.put("historico", historico);
        return resposta;
    }

    /**
     * Cadastra a chave pública. O corpo traz a senha da conta e um payload assinado com a
     * chave nova ({ tipo: "CHAVE_CADASTRADA", usuarioId, chavePublica, data }), que prova que
     * quem está cadastrando tem mesmo a chave privada.
     */
    @PostMapping("/api/chaves")
    @Transactional
    public ResponseEntity<ChaveDigital> cadastrar(@RequestBody Map<String, String> corpo) {
        Perfil perfil = usuarioAtual.exigir();
        exigirSenhaDaConta(perfil, corpo.get("senhaConta"));

        String payload = corpo.get("payload");
        String assinatura = corpo.get("assinatura");
        Map<String, Object> dados = assinaturaService.lerPayload(Objects.toString(payload, ""));
        String chavePublica = String.valueOf(dados.get("chavePublica"));

        assinaturaService.validarChavePublica(chavePublica);
        if (!"CHAVE_CADASTRADA".equals(dados.get("tipo"))
                || !perfil.getId().equals(AssinaturaService.comoLong(dados.get("usuarioId")))) {
            throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "Pedido de cadastro de chave inválido.");
        }
        exigirDataRecente(dados.get("data"));
        if (!assinaturaService.assinaturaConfere(chavePublica, payload, assinatura)) {
            throw new RegraNegocioException(HttpStatus.FORBIDDEN, "A assinatura não confere com a chave enviada.");
        }
        if (chaveRepository.existsByChavePublica(chavePublica)) {
            throw new RegraNegocioException(HttpStatus.CONFLICT,
                    "Essa chave já foi cadastrada antes. Uma chave revogada não pode voltar a ser usada.");
        }
        if (assinaturaService.chaveAtivaDoUsuario(perfil.getId()).isPresent()) {
            throw new RegraNegocioException(HttpStatus.CONFLICT,
                    "Sua conta já tem uma chave ativa. Revogue-a antes de cadastrar outra.");
        }

        // Uma chave pendente antiga é substituída pela nova
        chaveRepository.findFirstByUsuarioIdAndTipoAndStatus(perfil.getId(), ChaveDigital.TIPO_USUARIO, ChaveDigital.PENDENTE)
                .ifPresent(c -> {
                    c.revogar("Substituída por outra chave pendente");
                    chaveRepository.save(c);
                });

        boolean primeiraChave = !chaveRepository.existsByUsuarioId(perfil.getId());
        ChaveDigital chave = chaveRepository.save(new ChaveDigital(perfil.getId(), ChaveDigital.TIPO_USUARIO, chavePublica,
                primeiraChave ? ChaveDigital.ATIVA : ChaveDigital.PENDENTE));
        assinaturaService.registrarCadastroDeChave(perfil.getId(), chave, payload, assinatura);
        return ResponseEntity.status(HttpStatus.CREATED).body(chave);
    }

    /** Revoga a chave ativa (ou pendente), por exemplo se o pendrive foi perdido ou roubado. */
    @PostMapping("/api/chaves/revogar")
    @Transactional
    public ResponseEntity<Map<String, Object>> revogar(@RequestBody Map<String, String> corpo) {
        Perfil perfil = usuarioAtual.exigir();
        exigirSenhaDaConta(perfil, corpo.get("senhaConta"));

        List<ChaveDigital> revogaveis = chaveRepository.findByUsuarioIdOrderByCriadaEmDesc(perfil.getId()).stream()
                .filter(c -> !ChaveDigital.REVOGADA.equals(c.getStatus())).toList();
        if (revogaveis.isEmpty()) {
            throw new RegraNegocioException(HttpStatus.NOT_FOUND, "Sua conta não tem chave para revogar.");
        }
        for (ChaveDigital c : revogaveis) {
            c.revogar("Revogada pelo próprio usuário");
            chaveRepository.save(c);
            assinaturaService.registrarSemAssinatura(perfil.getId(), "CHAVE_REVOGADA",
                    Map.of("chaveId", c.getId(), "chavePublica", c.getChavePublica(), "por", "usuario"), "chave:" + c.getId());
        }
        return ResponseEntity.ok(minhaChave());
    }

    /** Verifica a corrente inteira e os registros do usuário logado. */
    @GetMapping("/api/registros/verificar")
    public Map<String, Object> verificar() {
        return integridadeService.verificar(usuarioAtual.exigir().getId());
    }

    private void exigirSenhaDaConta(Perfil perfil, String senha) {
        if (senha == null || !passwordEncoder.matches(senha, perfil.getSenha())) {
            throw new RegraNegocioException(HttpStatus.FORBIDDEN, "Senha da conta incorreta.");
        }
    }

    static void exigirDataRecente(Object data) {
        try {
            if (Duration.between(Instant.parse(String.valueOf(data)), Instant.now()).abs().toMinutes() >= 5) {
                throw new IllegalArgumentException();
            }
        } catch (Exception e) {
            throw new RegraNegocioException(HttpStatus.BAD_REQUEST,
                    "O pedido expirou ou o relógio deste computador está errado. Tente de novo.");
        }
    }
}
