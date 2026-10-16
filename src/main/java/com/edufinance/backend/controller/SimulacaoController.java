package com.edufinance.backend.controller;

import com.edufinance.backend.model.Medalha;
import com.edufinance.backend.model.Perfil;
import com.edufinance.backend.model.Simulacao;
import com.edufinance.backend.repository.MedalhaRepository;
import com.edufinance.backend.repository.SimulacaoRepository;
import com.edufinance.backend.service.RegraNegocioException;
import com.edufinance.backend.service.TaxasService;
import com.edufinance.backend.service.UsuarioAtualService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
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
    private MedalhaRepository medalhaRepository;

    @Autowired
    private UsuarioAtualService usuarioAtual;

    @Autowired
    private TaxasService taxasService;

    /** Taxas reais de cada tipo de investimento (Banco Central e, para ações, busca na web lida pelo Ollama). */
    @GetMapping("/taxas")
    public Map<String, Object> taxas() {
        return taxasService.listar();
    }

    /*
     * Calcula e salva uma projeção de juros compostos.
     * A simulação é só uma projeção: ela não altera o saldo virtual do usuário.
     */
    @PostMapping
    public ResponseEntity<Map<String, Object>> rodarSimulacao(@RequestBody Map<String, Object> payload) {
        Perfil perfil = usuarioAtual.exigir();

        String tipoInvestimento;
        double valorInicial;
        double aporteMensal;
        double taxaAnual;
        int tempoMeses;
        Double valorMeta = null; // só no modo Meta
        String calculoMeta = null; // só no modo Meta: "aporte" ou "prazo"
        try {
            tipoInvestimento = payload.get("tipoInvestimento").toString().trim();
            valorInicial = Double.parseDouble(payload.get("valorInicial").toString());
            aporteMensal = Double.parseDouble(payload.get("aporteMensal").toString());
            taxaAnual = Double.parseDouble(payload.get("taxaAnual").toString());
            tempoMeses = Integer.parseInt(payload.get("tempoMeses").toString());
            if (payload.get("valorMeta") != null) {
                valorMeta = Double.parseDouble(payload.get("valorMeta").toString());
            }
            if (payload.get("calculoMeta") != null) {
                calculoMeta = payload.get("calculoMeta").toString();
            }
        } catch (Exception e) {
            throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "Preencha todos os campos da simulação com números válidos.");
        }

        if (tipoInvestimento.isEmpty() || tipoInvestimento.length() > 255) {
            throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "Informe o tipo de investimento ou o nome da meta (até 255 caracteres).");
        }
        if (!(valorInicial >= 0) || !(aporteMensal >= 0) || valorInicial > 1e12 || aporteMensal > 1e12) {
            throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "Os valores de aporte não podem ser negativos.");
        }
        if (valorMeta != null && (!(valorMeta > 0) || valorMeta > 1e12)) {
            throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "Informe um valor de meta maior que zero.");
        }
        if (calculoMeta != null && !calculoMeta.equals("aporte") && !calculoMeta.equals("prazo")) {
            throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "Tipo de cálculo da meta inválido.");
        }
        if (!(taxaAnual >= 0) || taxaAnual > 1000) {
            throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "A taxa anual deve ficar entre 0% e 1000%.");
        }
        if (tempoMeses < 1 || tempoMeses > 1200) {
            throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "O prazo deve ficar entre 1 e 1200 meses.");
        }

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
        sim.setValorMeta(valorMeta);
        sim.setCalculoMeta(valorMeta != null ? calculoMeta : null);
        sim.setCriadoEm(LocalDateTime.now());

        Simulacao simSalva = simulacaoRepository.save(sim);

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
        return simulacaoRepository.findByUsuarioIdOrderByCriadoEmDesc(usuarioId);
    }

    // Apaga uma simulação do histórico do próprio usuário
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> apagarSimulacao(@PathVariable Long id) {
        Perfil perfil = usuarioAtual.exigir();
        Simulacao sim = simulacaoRepository.findById(id)
                .filter(s -> s.getUsuarioId().equals(perfil.getId()))
                .orElseThrow(() -> new RegraNegocioException(HttpStatus.NOT_FOUND, "Simulação não encontrada."));
        simulacaoRepository.delete(sim);
        return ResponseEntity.noContent().build();
    }
}
