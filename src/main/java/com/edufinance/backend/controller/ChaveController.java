package com.edufinance.backend.controller;

import com.edufinance.backend.model.ChaveDigital;
import com.edufinance.backend.model.Perfil;
import com.edufinance.backend.repository.ChaveDigitalRepository;
import com.edufinance.backend.repository.PerfilRepository;
import com.edufinance.backend.service.AssinaturaService;
import com.edufinance.backend.service.AssinaturaService.AcaoAssinada;
import com.edufinance.backend.service.IntegridadeService;
import com.edufinance.backend.service.RegraNegocioException;
import com.edufinance.backend.service.UsuarioAtualService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.time.Instant;
import java.util.*;

/**
 * Chave digital do usuário logado.
 *
 * Regras:
 * - A primeira chave de uma conta já nasce ativa.
 * - Qualquer chave depois disso (perdeu a antiga, quer trocar) nasce pendente e só vale quando o
 *   administrador aprova; ao aprovar, a chave ativa anterior é revogada. Assim, quem descobrir a
 *   senha da conta não consegue trocar a chave sozinho.
 * - Revogar a chave ativa exige assinatura dela mesma. Quem perdeu a chave pede uma nova (pendente).
 * - Ligar ou desligar "exigir a chave para entrar" também exige assinatura.
 */
@RestController
@CrossOrigin(origins = "*")
public class ChaveController {

    @Autowired
    private ChaveDigitalRepository chaveRepository;

    @Autowired
    private PerfilRepository perfilRepository;

    @Autowired
    private AssinaturaService assinaturaService;

    @Autowired
    private IntegridadeService integridadeService;

    @Autowired
    private UsuarioAtualService usuarioAtual;

    @Autowired
    private PasswordEncoder passwordEncoder;

    /** Situação da chave: a ativa, a pendente, a última sequência usada e o histórico. */
    @GetMapping("/api/chaves/me")
    public Map<String, Object> minhaChave() {
        Perfil perfil = usuarioAtual.exigir();
        List<ChaveDigital> historico = chaveRepository.findByUsuarioIdOrderByCriadaEmDesc(perfil.getId());
        ChaveDigital ativa = historico.stream().filter(c -> ChaveDigital.ATIVA.equals(c.getStatus())).findFirst().orElse(null);
        ChaveDigital pendente = historico.stream().filter(c -> ChaveDigital.PENDENTE.equals(c.getStatus())).findFirst().orElse(null);

        Map<String, Object> resposta = new LinkedHashMap<>();
        resposta.put("chave", ativa);
        resposta.put("pendente", pendente);
        resposta.put("ultimaSequencia", ativa == null ? 0 : assinaturaService.ultimaSequencia(ativa));
        // Conta que já teve chave só opera assinando; sem chave ativa, fica bloqueada
        resposta.put("contaUsaChave", !historico.isEmpty());
        resposta.put("exigirChaveLogin", perfil.isExigirChaveLogin());
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

        // Um pedido pendente antigo é substituído pelo novo
        chaveRepository.findFirstByUsuarioIdAndTipoAndStatus(perfil.getId(), ChaveDigital.TIPO_USUARIO, ChaveDigital.PENDENTE)
                .ifPresent(c -> {
                    c.revogar("Substituída por outro pedido de chave");
                    chaveRepository.save(c);
                });

        boolean primeiraChave = !chaveRepository.existsByUsuarioId(perfil.getId());
        ChaveDigital chave = chaveRepository.save(new ChaveDigital(perfil.getId(), ChaveDigital.TIPO_USUARIO, chavePublica,
                primeiraChave ? ChaveDigital.ATIVA : ChaveDigital.PENDENTE));
        assinaturaService.registrarCadastroDeChave(perfil.getId(), chave, payload, assinatura);
        return ResponseEntity.status(HttpStatus.CREATED).body(chave);
    }

    /**
     * Revoga a chave ativa. Precisa vir assinado por ela mesma
     * ({ tipo: "CHAVE_REVOGADA", usuarioId, sequencia, data, chaveId }).
     * Quem perdeu a chave não consegue assinar: cria uma nova, que o administrador aprova.
     */
    @PostMapping("/api/chaves/revogar")
    @Transactional
    public ResponseEntity<Map<String, Object>> revogar(@RequestBody Map<String, Object> corpo) {
        Perfil perfil = usuarioAtual.exigir();
        ChaveDigital ativa = assinaturaService.chaveAtivaDoUsuario(perfil.getId())
                .orElseThrow(() -> new RegraNegocioException(HttpStatus.NOT_FOUND, "Sua conta não tem chave ativa para revogar."));
        AcaoAssinada acao = assinaturaService.verificarDoUsuario(perfil.getId(), Set.of("CHAVE_REVOGADA"), corpo.get("assinatura"));
        if (!ativa.getId().equals(AssinaturaService.comoLong(acao.dados().get("chaveId")))) {
            throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "A assinatura é de outra chave.");
        }

        ativa.revogar("Revogada pelo próprio usuário");
        chaveRepository.save(ativa);
        assinaturaService.registrar(perfil.getId(), acao, "chave:" + ativa.getId());
        return ResponseEntity.ok(minhaChave());
    }

    /** Cancela um pedido de chave que ainda está esperando aprovação (só pede a senha da conta). */
    @PostMapping("/api/chaves/cancelar-pendente")
    @Transactional
    public ResponseEntity<Map<String, Object>> cancelarPendente(@RequestBody Map<String, String> corpo) {
        Perfil perfil = usuarioAtual.exigir();
        exigirSenhaDaConta(perfil, corpo.get("senhaConta"));
        ChaveDigital pendente = chaveRepository
                .findFirstByUsuarioIdAndTipoAndStatus(perfil.getId(), ChaveDigital.TIPO_USUARIO, ChaveDigital.PENDENTE)
                .orElseThrow(() -> new RegraNegocioException(HttpStatus.NOT_FOUND, "Não há pedido de chave pendente."));
        pendente.revogar("Pedido cancelado pelo usuário");
        chaveRepository.save(pendente);
        assinaturaService.registrarSemAssinatura(perfil.getId(), "CHAVE_PEDIDO_CANCELADO",
                Map.of("chaveId", pendente.getId(), "chavePublica", pendente.getChavePublica()), "chave:" + pendente.getId());
        return ResponseEntity.ok(minhaChave());
    }

    /** Liga ou desliga "só entrar com a chave". Assinado: { tipo: "CONFIG_EXIGIR_CHAVE", ..., ativo }. */
    @PostMapping("/api/chaves/exigir-login")
    @Transactional
    public Perfil exigirChaveNoLogin(@RequestBody Map<String, Object> corpo) {
        Perfil perfil = usuarioAtual.exigir();
        if (assinaturaService.chaveAtivaDoUsuario(perfil.getId()).isEmpty()) {
            throw new RegraNegocioException(HttpStatus.CONFLICT, "Você precisa de uma chave ativa para isso.");
        }
        AcaoAssinada acao = assinaturaService.verificarDoUsuario(perfil.getId(), Set.of("CONFIG_EXIGIR_CHAVE"), corpo.get("assinatura"));
        perfil.setExigirChaveLogin(Boolean.TRUE.equals(acao.dados().get("ativo")));
        Perfil salvo = perfilRepository.save(perfil);
        assinaturaService.registrar(perfil.getId(), acao, "perfil:" + perfil.getId());
        return salvo;
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
