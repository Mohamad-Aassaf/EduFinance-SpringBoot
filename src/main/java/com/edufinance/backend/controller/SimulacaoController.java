package com.edufinance.backend.controller;

import com.edufinance.backend.model.Medalha;
import com.edufinance.backend.model.Perfil;
import com.edufinance.backend.model.Simulacao;
import com.edufinance.backend.repository.MedalhaRepository;
import com.edufinance.backend.repository.PerfilRepository;
import com.edufinance.backend.repository.SimulacaoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/simulacoes")
@CrossOrigin(origins = "*")
public class SimulacaoController {

    @Autowired
    private SimulacaoRepository simulacaoRepository;

    @Autowired
    private PerfilRepository perfilRepository;

    @Autowired
    private MedalhaRepository medalhaRepository;

    @PostMapping
    public ResponseEntity<Map<String, Object>> rodarSimulacao(@RequestBody Map<String, Object> payload) {
        Long usuarioId = Long.valueOf(payload.get("usuarioId").toString());
        String tipoInvestimento = payload.get("tipoInvestimento").toString();
        double valorInicial = Double.parseDouble(payload.get("valorInicial").toString());
        double aporteMensal = Double.parseDouble(payload.get("aporteMensal").toString());
        double taxaAnual = Double.parseDouble(payload.get("taxaAnual").toString());
        int tempoMeses = Integer.parseInt(payload.get("tempoMeses").toString());

        Optional<Perfil> perfilOpt = perfilRepository.findById(usuarioId);
        if (perfilOpt.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        Perfil perfil = perfilOpt.get();

        double taxaMensal = (taxaAnual / 12.0) / 100.0;
        double valorFinal = 0;

        if (taxaMensal == 0) {
            valorFinal = valorInicial + (aporteMensal * tempoMeses);
        } else {
            double montanteInicial = valorInicial * Math.pow(1 + taxaMensal, tempoMeses);
            double montanteAportes = aporteMensal * ((Math.pow(1 + taxaMensal, tempoMeses) - 1) / taxaMensal);
            valorFinal = montanteInicial + montanteAportes;
        }

        valorFinal = Math.round(valorFinal * 100.0) / 100.0;

        Simulacao sim = new Simulacao();
        sim.setUsuarioId(perfil.getId());
        sim.setTipoInvestimento(tipoInvestimento);
        sim.setValorInicial(valorInicial);
        sim.setAporteMensal(aporteMensal);
        sim.setTaxaAnual(taxaAnual);
        sim.setTempoMeses(tempoMeses);
        sim.setValorFinal(valorFinal);
        sim.setCriadoEm(LocalDateTime.now());

        Simulacao simSalva = simulacaoRepository.save(sim);

        perfil.setSaldoVirtual(valorFinal);
        perfilRepository.save(perfil);

        List<String> medalhasDesbloqueadas = new ArrayList<>();
        Optional<Medalha> medalhaOpt = medalhaRepository.findByUsuarioIdAndTipoMedalha(perfil.getId(), "Simulador Pro");
        if (medalhaOpt.isEmpty()) {
            Medalha medalha = new Medalha();
            medalha.setUsuarioId(perfil.getId());
            medalha.setTipoMedalha("Simulador Pro");
            medalhaRepository.save(medalha);
            medalhasDesbloqueadas.add("Simulador Pro");
        }

        Map<String, Object> response = new HashMap<>();
        response.put("simulacao", simSalva);
        response.put("medalhasDesbloqueadas", medalhasDesbloqueadas);
        response.put("saldoAtualizado", perfil.getSaldoVirtual());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/usuario/{usuarioId}")
    public List<Simulacao> getSimulacoesUsuario(@PathVariable Long usuarioId) {
        return simulacaoRepository.findByUsuarioId(usuarioId);
    }
}
