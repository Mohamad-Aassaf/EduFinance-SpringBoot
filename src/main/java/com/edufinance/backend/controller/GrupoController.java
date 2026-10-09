package com.edufinance.backend.controller;

import com.edufinance.backend.dto.RankingDtos.DadosEntrada;
import com.edufinance.backend.dto.RankingDtos.DadosGrupo;
import com.edufinance.backend.dto.RankingDtos.DadosPapel;
import com.edufinance.backend.dto.RankingDtos.GrupoResumo;
import com.edufinance.backend.dto.RankingDtos.MembroGrupo;
import com.edufinance.backend.dto.RankingDtos.PaginaGrupos;
import com.edufinance.backend.dto.RankingDtos.PaginaRanking;
import com.edufinance.backend.model.PapelGrupo;
import com.edufinance.backend.service.GrupoService;
import com.edufinance.backend.service.RankingService;
import com.edufinance.backend.service.UsuarioAtualService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// Grupos de ranking: competições entre conhecidos. As regras ficam no GrupoService.
@RestController
@RequestMapping("/api/grupos")
@CrossOrigin(origins = "*")
public class GrupoController {

    @Autowired
    private GrupoService grupoService;

    @Autowired
    private UsuarioAtualService usuarioAtual;

    // Cria um grupo; quem cria vira administrador
    @PostMapping
    public ResponseEntity<GrupoResumo> criar(@RequestBody DadosGrupo dados) {
        return ResponseEntity.status(HttpStatus.CREATED).body(grupoService.criar(usuarioAtual.exigir(), dados));
    }

    // Grupos dos quais o usuário logado participa
    @GetMapping("/meus")
    public List<GrupoResumo> meus() {
        return grupoService.meusGrupos(usuarioAtual.exigir());
    }

    // Grupos que aparecem na busca (abertos e protegidos por senha)
    @GetMapping("/descobrir")
    public PaginaGrupos descobrir(
            @RequestParam(required = false) String busca,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "12") int tamanho) {
        return grupoService.descobrir(usuarioAtual.exigir(), busca, pagina, tamanho);
    }

    // Prévia do grupo de um convite, para confirmar antes de entrar
    @GetMapping("/convite/{codigo}")
    public GrupoResumo previaDoConvite(@PathVariable String codigo) {
        return grupoService.previaDoConvite(usuarioAtual.exigir(), codigo);
    }

    @PostMapping("/convite/{codigo}/entrar")
    public GrupoResumo entrarPorConvite(@PathVariable String codigo) {
        return grupoService.entrarPorConvite(usuarioAtual.exigir(), codigo);
    }

    @GetMapping("/{id}")
    public GrupoResumo detalhe(@PathVariable Long id) {
        return grupoService.detalhe(usuarioAtual.exigir(), id);
    }

    @PutMapping("/{id}")
    public GrupoResumo atualizar(@PathVariable Long id, @RequestBody DadosGrupo dados) {
        return grupoService.atualizar(usuarioAtual.exigir(), id, dados);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(@PathVariable Long id) {
        grupoService.excluir(usuarioAtual.exigir(), id);
        return ResponseEntity.noContent().build();
    }

    // Classificação exclusiva do grupo, pela métrica que ele escolheu
    @GetMapping("/{id}/ranking")
    public PaginaRanking ranking(
            @PathVariable Long id,
            @RequestParam(required = false) String busca,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "" + RankingService.TAMANHO_PADRAO) int tamanho) {
        return grupoService.ranking(usuarioAtual.exigir(), id, busca, pagina, tamanho);
    }

    @GetMapping("/{id}/membros")
    public List<MembroGrupo> membros(@PathVariable Long id) {
        return grupoService.membros(usuarioAtual.exigir(), id);
    }

    // Entra em um grupo aberto ou, informando a senha, em um grupo protegido
    @PostMapping("/{id}/entrar")
    public GrupoResumo entrar(@PathVariable Long id, @RequestBody(required = false) DadosEntrada dados) {
        return grupoService.entrar(usuarioAtual.exigir(), id, dados == null ? null : dados.senha());
    }

    @PostMapping("/{id}/sair")
    public ResponseEntity<Void> sair(@PathVariable Long id) {
        grupoService.sair(usuarioAtual.exigir(), id);
        return ResponseEntity.noContent().build();
    }

    // Gera um novo código de convite e invalida o anterior (só administradores)
    @PostMapping("/{id}/convite")
    public GrupoResumo regenerarConvite(@PathVariable Long id) {
        return grupoService.regenerarConvite(usuarioAtual.exigir(), id);
    }

    @DeleteMapping("/{id}/membros/{perfilId}")
    public ResponseEntity<Void> removerMembro(@PathVariable Long id, @PathVariable Long perfilId) {
        grupoService.removerMembro(usuarioAtual.exigir(), id, perfilId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/membros/{perfilId}/papel")
    public ResponseEntity<Void> alterarPapel(@PathVariable Long id, @PathVariable Long perfilId,
                                             @RequestBody DadosPapel dados) {
        grupoService.alterarPapel(usuarioAtual.exigir(), id, perfilId, PapelGrupo.de(dados.papel()));
        return ResponseEntity.noContent().build();
    }
}
