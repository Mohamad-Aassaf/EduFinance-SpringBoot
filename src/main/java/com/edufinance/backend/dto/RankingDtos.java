package com.edufinance.backend.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Formatos de entrada e saída da API de rankings e grupos.
 * As respostas levam só o que a tela precisa: nunca e-mail, senha ou hash.
 */
public final class RankingDtos {

    private RankingDtos() {
    }

    // ── Rankings ────────────────────────────────────────────────────

    public record EntradaRanking(
            long posicao,
            Long id,
            String nome,
            int nivel,
            int xp,
            double saldoVirtual,
            String avatarUrl,
            String pais,
            String estado,
            String cidade) {
    }

    public record PaginaRanking(
            List<EntradaRanking> itens,
            int pagina,
            int tamanho,
            long total,              // resultados da consulta (considera a busca)
            int totalPaginas,
            long totalParticipantes, // todos os participantes do ranking
            Long minhaPosicao) {     // null quando o usuário não participa
    }

    public record RespostaRanking(
            String escopo,
            String metrica,
            Map<String, String> local,   // localização do usuário usada no filtro
            List<String> camposFaltando, // campos do perfil que faltam para este escopo
            PaginaRanking ranking) {     // null enquanto faltar localização
    }

    public record PerfilPublico(
            Long id,
            String nome,
            int nivel,
            int xp,
            double saldoVirtual,
            String avatarUrl,
            String pais,
            String estado,
            String cidade,
            LocalDateTime criadoEm,
            List<String> medalhas,
            Long posicaoGlobal) {
    }

    public record DadosLocalizacao(String pais, String estado, String cidade) {
    }

    // ── Grupos ──────────────────────────────────────────────────────

    public record DadosGrupo(
            String nome,
            String descricao,
            String icone,
            String acesso,
            String metrica,
            String senha) {
    }

    public record DadosEntrada(String senha) {
    }

    public record DadosPapel(String papel) {
    }

    public record GrupoResumo(
            Long id,
            String nome,
            String descricao,
            String icone,
            String acesso,
            String metrica,
            long totalMembros,
            boolean souMembro,
            String meuPapel,       // null para quem não é membro
            Long minhaPosicao,     // null para quem não é membro
            String codigoConvite,  // só para membros
            LocalDateTime criadoEm) {
    }

    public record PaginaGrupos(
            List<GrupoResumo> itens,
            int pagina,
            int tamanho,
            long total,
            int totalPaginas) {
    }

    public record MembroGrupo(
            Long perfilId,
            String nome,
            String avatarUrl,
            String papel,
            LocalDateTime entrouEm) {
    }
}
