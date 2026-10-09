package com.edufinance.backend.controller;

import com.edufinance.backend.dto.RankingDtos.PaginaRanking;
import com.edufinance.backend.dto.RankingDtos.PerfilPublico;
import com.edufinance.backend.dto.RankingDtos.RespostaRanking;
import com.edufinance.backend.model.EscopoRanking;
import com.edufinance.backend.model.Medalha;
import com.edufinance.backend.model.MetricaRanking;
import com.edufinance.backend.model.Perfil;
import com.edufinance.backend.repository.MedalhaRepository;
import com.edufinance.backend.repository.PerfilRepository;
import com.edufinance.backend.service.RankingService;
import com.edufinance.backend.service.RegraNegocioException;
import com.edufinance.backend.service.UsuarioAtualService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

// Rankings públicos por escopo geográfico (global, país, estado e cidade)
@RestController
@RequestMapping("/api/rankings")
@CrossOrigin(origins = "*")
public class RankingController {

    @Autowired
    private RankingService rankingService;

    @Autowired
    private UsuarioAtualService usuarioAtual;

    @Autowired
    private PerfilRepository perfilRepository;

    @Autowired
    private MedalhaRepository medalhaRepository;

    /*
     * Os escopos regionais comparam com a localização salva no perfil de quem consulta.
     * Se faltar algum campo, a resposta vem sem ranking e diz quais campos faltam.
     */
    @GetMapping
    public RespostaRanking classificar(
            @RequestParam(defaultValue = "global") String escopo,
            @RequestParam(defaultValue = "xp") String metrica,
            @RequestParam(required = false) String busca,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "" + RankingService.TAMANHO_PADRAO) int tamanho) {
        Perfil eu = usuarioAtual.exigir();
        EscopoRanking escopoRanking = EscopoRanking.de(escopo);
        MetricaRanking metricaRanking = MetricaRanking.de(metrica);

        Map<String, String> local = new LinkedHashMap<>();
        for (String campo : escopoRanking.getCampos()) {
            local.put(campo, EscopoRanking.valorDoCampo(eu, campo));
        }

        List<String> faltando = escopoRanking.camposFaltando(eu);
        PaginaRanking ranking = faltando.isEmpty()
                ? rankingService.classificar(RankingService.Filtro.escopo(escopoRanking, eu), metricaRanking,
                        eu.getId(), busca, pagina, tamanho)
                : null;

        return new RespostaRanking(escopoRanking.name(), metricaRanking.name(), local, faltando, ranking);
    }

    // Perfil público de um participante: só dados que já aparecem nos rankings
    @GetMapping("/perfis/{id}")
    public PerfilPublico perfilPublico(@PathVariable Long id) {
        usuarioAtual.exigir();
        Perfil perfil = perfilRepository.findById(id)
                .orElseThrow(() -> new RegraNegocioException(HttpStatus.NOT_FOUND, "Usuário não encontrado."));
        List<String> medalhas = medalhaRepository.findByUsuarioId(id).stream()
                .map(Medalha::getTipoMedalha)
                .toList();
        Long posicaoGlobal = rankingService.posicaoDe(RankingService.Filtro.global(), MetricaRanking.XP, id);
        return new PerfilPublico(perfil.getId(), perfil.getNome(), perfil.getNivel(), perfil.getXp(),
                perfil.getSaldoVirtual(), perfil.getAvatarUrl(), perfil.getPais(), perfil.getEstado(),
                perfil.getCidade(), perfil.getCriadoEm(), medalhas, posicaoGlobal);
    }
}
