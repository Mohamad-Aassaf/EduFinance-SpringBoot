package com.edufinance.backend.controller;

import com.edufinance.backend.model.ChaveDigital;
import com.edufinance.backend.model.Perfil;
import com.edufinance.backend.model.ProgressoUsuario;
import com.edufinance.backend.repository.ChaveDigitalRepository;
import com.edufinance.backend.repository.MedalhaRepository;
import com.edufinance.backend.repository.PerfilRepository;
import com.edufinance.backend.repository.ProgressoUsuarioRepository;
import com.edufinance.backend.service.AssinaturaService;
import com.edufinance.backend.service.AssinaturaService.AcaoAssinada;
import com.edufinance.backend.service.FinBotService;
import com.edufinance.backend.service.RecuperacaoSenhaService;
import com.edufinance.backend.service.RegraNegocioException;
import com.edufinance.backend.service.UsuarioAtualService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/*
 * Ferramentas do painel do administrador. Toda operação exige a senha de administrador
 * (a mesma do servidor da IA).
 *
 * Se o administrador cadastrou uma chave digital, as ações que mexem em dados de usuários
 * (saldo, reset da trilha, aprovar e revogar chaves) também precisam vir assinadas com ela,
 * e ficam registradas na corrente com essa assinatura.
 */
@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*")
public class AdminController {

    // XP que cada aula concluída rende (ver LicaoController.concluirLicao)
    private static final int XP_POR_AULA = 20;
    private static final List<String> MEDALHAS_DA_TRILHA = List.of("Primeira Aula", "Mestre das Finanças");

    @Autowired
    private FinBotService finBotService;

    @Autowired
    private UsuarioAtualService usuarioAtual;

    @Autowired
    private PerfilRepository perfilRepository;

    @Autowired
    private ProgressoUsuarioRepository progressoUsuarioRepository;

    @Autowired
    private MedalhaRepository medalhaRepository;

    @Autowired
    private ChaveDigitalRepository chaveRepository;

    @Autowired
    private AssinaturaService assinaturaService;

    @Autowired
    private RecuperacaoSenhaService recuperacaoSenhaService;

    // ── Saldo e trilha da conta logada ──────────────────────────────────────

    /* Define o saldo virtual do usuário logado */
    @PutMapping("/me/saldo")
    @Transactional
    public ResponseEntity<Perfil> definirMeuSaldo(@RequestBody Map<String, Object> payload) {
        finBotService.exigirAdmin(texto(payload.get("password")));
        Perfil perfil = usuarioAtual.exigir();
        AcaoAssinada acao = assinaturaService.verificarDoAdmin(perfil.getId(), "ADMIN_SALDO", payload.get("assinaturaAdmin"));

        double valor;
        try {
            Object fonte = acao != null ? acao.dados().get("valor") : payload.get("valor");
            valor = Double.parseDouble(fonte.toString());
        } catch (Exception e) {
            throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "Informe um valor numérico para o saldo.");
        }
        if (!(valor >= 0) || valor > 1_000_000_000) {
            throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "O saldo deve ficar entre R$ 0 e R$ 1 bilhão.");
        }
        double anterior = perfil.getSaldoVirtual();
        perfil.setSaldoVirtual(Math.round(valor * 100.0) / 100.0);
        Perfil salvo = perfilRepository.save(perfil);

        assinaturaService.registrarAcao(perfil.getId(), acao, "ADMIN_SALDO",
                Map.of("valor", salvo.getSaldoVirtual(), "saldoAnterior", anterior), "perfil:" + perfil.getId());
        return ResponseEntity.ok(salvo);
    }

    /*
     * Zera a trilha do usuário logado: apaga as aulas concluídas, devolve o XP que elas
     * renderam e remove as medalhas ganhas pela trilha, como se nunca tivesse começado.
     */
    @PostMapping("/me/trilha/reset")
    @Transactional
    public ResponseEntity<Perfil> resetarMinhaTrilha(@RequestBody Map<String, Object> payload) {
        finBotService.exigirAdmin(texto(payload.get("password")));
        Perfil perfil = usuarioAtual.exigir();
        AcaoAssinada acao = assinaturaService.verificarDoAdmin(perfil.getId(), "ADMIN_RESET_TRILHA", payload.get("assinaturaAdmin"));

        List<ProgressoUsuario> progresso = progressoUsuarioRepository.findByUsuarioId(perfil.getId());
        long concluidas = progresso.stream().filter(ProgressoUsuario::isConcluido).count();
        progressoUsuarioRepository.deleteAll(progresso);

        for (String tipo : MEDALHAS_DA_TRILHA) {
            medalhaRepository.findByUsuarioIdAndTipoMedalha(perfil.getId(), tipo).ifPresent(medalhaRepository::delete);
        }

        int novoXp = (int) Math.max(0, perfil.getXp() - concluidas * XP_POR_AULA);
        perfil.setXp(novoXp);
        perfil.setNivel((novoXp / 100) + 1);
        Perfil salvo = perfilRepository.save(perfil);

        assinaturaService.registrarAcao(perfil.getId(), acao, "ADMIN_RESET_TRILHA",
                Map.of("aulasRemovidas", concluidas), "perfil:" + perfil.getId());
        return ResponseEntity.ok(salvo);
    }

    // ── Chave do administrador ──────────────────────────────────────────────

    @PostMapping("/chave/status")
    public Map<String, Object> statusDaChaveAdmin(@RequestBody Map<String, Object> corpo) {
        finBotService.exigirAdmin(texto(corpo.get("password")));
        Optional<ChaveDigital> chave = assinaturaService.chaveAtivaDoAdmin();
        Map<String, Object> resposta = new LinkedHashMap<>();
        resposta.put("chave", chave.orElse(null));
        resposta.put("ultimaSequencia", chave.map(assinaturaService::ultimaSequencia).orElse(0L));
        return resposta;
    }

    /*
     * Cadastra a chave do administrador. Precisa da senha de admin e de um payload assinado
     * com a chave nova ({ tipo: "ADMIN_CHAVE_CADASTRADA", chavePublica, data }).
     * Se já existe uma, ela é substituída (e a troca fica registrada na corrente).
     */
    @PostMapping("/chave")
    @Transactional
    public ResponseEntity<ChaveDigital> cadastrarChaveAdmin(@RequestBody Map<String, Object> corpo) {
        finBotService.exigirAdmin(texto(corpo.get("password")));
        String payload = texto(corpo.get("payload"));
        String assinatura = texto(corpo.get("assinatura"));
        Map<String, Object> dados = assinaturaService.lerPayload(Objects.toString(payload, ""));
        String chavePublica = String.valueOf(dados.get("chavePublica"));

        assinaturaService.validarChavePublica(chavePublica);
        if (!"ADMIN_CHAVE_CADASTRADA".equals(dados.get("tipo"))) {
            throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "Pedido de cadastro de chave inválido.");
        }
        ChaveController.exigirDataRecente(dados.get("data"));
        if (!assinaturaService.assinaturaConfere(chavePublica, payload, assinatura)) {
            throw new RegraNegocioException(HttpStatus.FORBIDDEN, "A assinatura não confere com a chave enviada.");
        }
        if (chaveRepository.existsByChavePublica(chavePublica)) {
            throw new RegraNegocioException(HttpStatus.CONFLICT, "Essa chave já foi cadastrada antes.");
        }

        assinaturaService.chaveAtivaDoAdmin().ifPresent(antiga -> {
            antiga.revogar("Substituída por uma nova chave de administrador");
            chaveRepository.save(antiga);
        });
        ChaveDigital chave = chaveRepository.save(new ChaveDigital(null, ChaveDigital.TIPO_ADMIN, chavePublica, ChaveDigital.ATIVA));
        assinaturaService.registrarCadastroDeChave(null, chave, payload, assinatura);
        return ResponseEntity.status(HttpStatus.CREATED).body(chave);
    }

    // ── Chaves dos usuários ─────────────────────────────────────────────────

    /** Chaves pendentes (esperando aprovação) e ativas, com o nome e o e-mail do dono. */
    @PostMapping("/chaves/listar")
    public List<Map<String, Object>> listarChaves(@RequestBody Map<String, Object> corpo) {
        finBotService.exigirAdmin(texto(corpo.get("password")));
        List<ChaveDigital> chaves = chaveRepository.findByTipoAndStatusInOrderByCriadaEmDesc(
                ChaveDigital.TIPO_USUARIO, List.of(ChaveDigital.PENDENTE, ChaveDigital.ATIVA));
        Map<Long, Perfil> donos = new HashMap<>();
        perfilRepository.findAllById(chaves.stream().map(ChaveDigital::getUsuarioId).distinct().toList())
                .forEach(p -> donos.put(p.getId(), p));

        List<Map<String, Object>> lista = new ArrayList<>();
        for (ChaveDigital c : chaves) {
            Perfil dono = donos.get(c.getUsuarioId());
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("chave", c);
            item.put("nome", dono == null ? "?" : dono.getNome());
            item.put("email", dono == null ? "?" : dono.getEmail());
            // Pendente de quem já tem chave ativa: aprovar troca a chave dessa pessoa
            item.put("substituiAtiva", ChaveDigital.PENDENTE.equals(c.getStatus())
                    && chaves.stream().anyMatch(o -> ChaveDigital.ATIVA.equals(o.getStatus()) && Objects.equals(o.getUsuarioId(), c.getUsuarioId())));
            lista.add(item);
        }
        return lista;
    }

    @PostMapping("/chaves/{id}/aprovar")
    @Transactional
    public ChaveDigital aprovarChave(@PathVariable Long id, @RequestBody Map<String, Object> corpo) {
        finBotService.exigirAdmin(texto(corpo.get("password")));
        ChaveDigital chave = chaveDeUsuario(id);
        AcaoAssinada acao = assinaturaService.verificarDoAdmin(chave.getUsuarioId(), "ADMIN_CHAVE_APROVADA", corpo.get("assinaturaAdmin"));
        exigirMesmaChave(acao, id);

        if (!ChaveDigital.PENDENTE.equals(chave.getStatus())) {
            throw new RegraNegocioException(HttpStatus.CONFLICT, "Só chaves pendentes podem ser aprovadas.");
        }
        // A chave aprovada substitui a que estava ativa (o usuário perdeu a antiga ou pediu a troca)
        Optional<ChaveDigital> anterior = assinaturaService.chaveAtivaDoUsuario(chave.getUsuarioId());
        anterior.ifPresent(a -> {
            a.revogar("Substituída pela nova chave aprovada");
            chaveRepository.save(a);
        });
        chave.ativar();
        chaveRepository.save(chave);
        Map<String, Object> campos = new LinkedHashMap<>();
        campos.put("chaveId", id);
        campos.put("chavePublica", chave.getChavePublica());
        anterior.ifPresent(a -> campos.put("substituiu", a.getId()));
        assinaturaService.registrarAcao(chave.getUsuarioId(), acao, "ADMIN_CHAVE_APROVADA", campos, "chave:" + id);
        return chave;
    }

    @PostMapping("/chaves/{id}/revogar")
    @Transactional
    public ChaveDigital revogarChave(@PathVariable Long id, @RequestBody Map<String, Object> corpo) {
        finBotService.exigirAdmin(texto(corpo.get("password")));
        ChaveDigital chave = chaveDeUsuario(id);
        AcaoAssinada acao = assinaturaService.verificarDoAdmin(chave.getUsuarioId(), "ADMIN_CHAVE_REVOGADA", corpo.get("assinaturaAdmin"));
        exigirMesmaChave(acao, id);

        if (ChaveDigital.REVOGADA.equals(chave.getStatus())) {
            throw new RegraNegocioException(HttpStatus.CONFLICT, "Essa chave já está revogada.");
        }
        chave.revogar(ChaveDigital.PENDENTE.equals(chave.getStatus()) ? "Recusada pelo administrador" : "Revogada pelo administrador");
        chaveRepository.save(chave);
        assinaturaService.registrarAcao(chave.getUsuarioId(), acao, "ADMIN_CHAVE_REVOGADA",
                Map.of("chaveId", id, "chavePublica", chave.getChavePublica()), "chave:" + id);
        return chave;
    }

    // ── Recuperação de senha ────────────────────────────────────────────────

    /** Pedidos de recuperação de senha em aberto, com o código (o app não envia e-mail de verdade). */
    @PostMapping("/recuperacoes")
    public List<Map<String, Object>> recuperacoes(@RequestBody Map<String, Object> corpo) {
        finBotService.exigirAdmin(texto(corpo.get("password")));
        return recuperacaoSenhaService.pedidosEmAberto();
    }

    private ChaveDigital chaveDeUsuario(Long id) {
        return chaveRepository.findById(id)
                .filter(c -> ChaveDigital.TIPO_USUARIO.equals(c.getTipo()))
                .orElseThrow(() -> new RegraNegocioException(HttpStatus.NOT_FOUND, "Chave não encontrada."));
    }

    private static void exigirMesmaChave(AcaoAssinada acao, Long id) {
        if (acao != null && !id.equals(AssinaturaService.comoLong(acao.dados().get("chaveId")))) {
            throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "A assinatura é de outra chave.");
        }
    }

    private static String texto(Object valor) {
        return valor == null ? null : valor.toString();
    }
}
