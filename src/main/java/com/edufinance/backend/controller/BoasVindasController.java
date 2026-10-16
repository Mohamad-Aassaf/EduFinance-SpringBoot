package com.edufinance.backend.controller;

import com.edufinance.backend.model.Perfil;
import com.edufinance.backend.repository.PerfilRepository;
import com.edufinance.backend.service.BoasVindasService;
import com.edufinance.backend.service.RegraNegocioException;
import com.edufinance.backend.service.UsuarioAtualService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Boas-Vindas de quem acabou de criar a conta: a pergunta introdutória avaliada
 * pela IA e a marcação de que a apresentação já foi vista.
 */
@RestController
@RequestMapping("/api/boas-vindas")
public class BoasVindasController {

    private final BoasVindasService boasVindasService;
    private final UsuarioAtualService usuarioAtual;
    private final PerfilRepository perfilRepository;

    public BoasVindasController(BoasVindasService boasVindasService, UsuarioAtualService usuarioAtual,
            PerfilRepository perfilRepository) {
        this.boasVindasService = boasVindasService;
        this.usuarioAtual = usuarioAtual;
        this.perfilRepository = perfilRepository;
    }

    @PostMapping("/avaliar")
    public Map<String, Object> avaliar(@RequestBody Map<String, String> request) {
        Perfil perfil = usuarioAtual.exigir();
        String resposta = request.getOrDefault("resposta", "").trim();
        if (resposta.length() < 10) {
            throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "Escreva pelo menos uma frase com as suas palavras.");
        }
        if (resposta.length() > 1500) {
            throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "A resposta pode ter no máximo 1500 caracteres.");
        }
        Map<String, Object> avaliacao = boasVindasService.avaliar(resposta);
        if (!perfil.isPerguntaIntroRespondida()) {
            perfil.setPerguntaIntroRespondida(true);
            perfilRepository.save(perfil);
        }
        return avaliacao;
    }

    @PostMapping("/concluir")
    public Perfil concluir() {
        Perfil perfil = usuarioAtual.exigir();
        perfil.setBoasVindasConcluidas(true);
        return perfilRepository.save(perfil);
    }
}
