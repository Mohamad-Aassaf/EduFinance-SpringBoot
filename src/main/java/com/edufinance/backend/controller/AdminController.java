package com.edufinance.backend.controller;

import com.edufinance.backend.model.Perfil;
import com.edufinance.backend.model.ProgressoUsuario;
import com.edufinance.backend.repository.MedalhaRepository;
import com.edufinance.backend.repository.PerfilRepository;
import com.edufinance.backend.repository.ProgressoUsuarioRepository;
import com.edufinance.backend.service.FinBotService;
import com.edufinance.backend.service.RegraNegocioException;
import com.edufinance.backend.service.UsuarioAtualService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/*
 * Ferramentas do painel do administrador que agem sobre a conta de quem está logado
 * (para testes). Toda operação exige a senha de administrador, a mesma do servidor da IA.
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

    /* Define o saldo virtual do usuário logado */
    @PutMapping("/me/saldo")
    public ResponseEntity<Perfil> definirMeuSaldo(@RequestBody Map<String, Object> payload) {
        finBotService.exigirAdmin(payload.get("password") == null ? null : payload.get("password").toString());
        Perfil perfil = usuarioAtual.exigir();
        double valor;
        try {
            valor = Double.parseDouble(payload.get("valor").toString());
        } catch (Exception e) {
            throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "Informe um valor numérico para o saldo.");
        }
        if (!(valor >= 0) || valor > 1_000_000_000) {
            throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "O saldo deve ficar entre R$ 0 e R$ 1 bilhão.");
        }
        perfil.setSaldoVirtual(Math.round(valor * 100.0) / 100.0);
        return ResponseEntity.ok(perfilRepository.save(perfil));
    }

    /*
     * Zera a trilha do usuário logado: apaga as aulas concluídas, devolve o XP que elas
     * renderam e remove as medalhas ganhas pela trilha, como se nunca tivesse começado.
     */
    @PostMapping("/me/trilha/reset")
    @Transactional
    public ResponseEntity<Perfil> resetarMinhaTrilha(@RequestBody Map<String, String> payload) {
        finBotService.exigirAdmin(payload.get("password"));
        Perfil perfil = usuarioAtual.exigir();

        List<ProgressoUsuario> progresso = progressoUsuarioRepository.findByUsuarioId(perfil.getId());
        long concluidas = progresso.stream().filter(ProgressoUsuario::isConcluido).count();
        progressoUsuarioRepository.deleteAll(progresso);

        for (String tipo : MEDALHAS_DA_TRILHA) {
            medalhaRepository.findByUsuarioIdAndTipoMedalha(perfil.getId(), tipo).ifPresent(medalhaRepository::delete);
        }

        int novoXp = (int) Math.max(0, perfil.getXp() - concluidas * XP_POR_AULA);
        perfil.setXp(novoXp);
        perfil.setNivel((novoXp / 100) + 1);
        return ResponseEntity.ok(perfilRepository.save(perfil));
    }
}
