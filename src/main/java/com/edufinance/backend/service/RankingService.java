package com.edufinance.backend.service;

import com.edufinance.backend.dto.RankingDtos.EntradaRanking;
import com.edufinance.backend.dto.RankingDtos.PaginaRanking;
import com.edufinance.backend.model.EscopoRanking;
import com.edufinance.backend.model.MetricaRanking;
import com.edufinance.backend.model.Perfil;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Calcula as classificações direto no banco, a partir dos perfis persistidos.
 *
 * Todos os rankings (global, regionais e de grupos) usam a mesma consulta:
 * muda apenas o filtro de quem participa e a métrica de ordenação.
 *
 * Desempate: quem tem a mesma pontuação é ordenado pelo id do perfil,
 * ou seja, a conta mais antiga fica na frente. Assim a posição de cada
 * usuário é sempre a mesma entre uma consulta e outra.
 */
@Service
public class RankingService {

    public static final int TAMANHO_PADRAO = 20;
    public static final int TAMANHO_MAXIMO = 50;

    @PersistenceContext
    private EntityManager em;

    /** Quem participa de um ranking: um trecho de WHERE e os seus parâmetros. */
    public record Filtro(String condicao, Map<String, Object> parametros) {

        public static Filtro global() {
            return new Filtro("1 = 1", Map.of());
        }

        public static Filtro grupo(Long grupoId) {
            return new Filtro(
                    "p.id IN (SELECT m.perfil_id FROM grupo_membros m WHERE m.grupo_id = :grupoId)",
                    Map.of("grupoId", grupoId));
        }

        /** Filtro de um escopo geográfico, comparando com a localização do perfil informado. */
        public static Filtro escopo(EscopoRanking escopo, Perfil perfil) {
            if (escopo.getCampos().isEmpty()) {
                return global();
            }
            List<String> condicoes = new ArrayList<>();
            Map<String, Object> parametros = new LinkedHashMap<>();
            for (String campo : escopo.getCampos()) {
                // Os nomes dos campos vêm do enum, não da requisição
                condicoes.add("LOWER(p." + campo + ") = LOWER(:" + campo + ")");
                parametros.put(campo, EscopoRanking.valorDoCampo(perfil, campo).trim());
            }
            return new Filtro(String.join(" AND ", condicoes), parametros);
        }
    }

    @Transactional(readOnly = true)
    public PaginaRanking classificar(Filtro filtro, MetricaRanking metrica, Long perfilAtualId,
                                     String busca, int pagina, int tamanho) {
        int paginaSegura = Math.max(pagina, 0);
        int tamanhoSeguro = Math.min(Math.max(tamanho, 1), TAMANHO_MAXIMO);
        String padrao = padraoDeBusca(busca);

        String classificados = cte(filtro, metrica);
        String filtroBusca = padrao == null ? "" : " WHERE LOWER(c.nome) LIKE LOWER(:padrao) ESCAPE '!'";

        Query consultaItens = em.createNativeQuery(classificados
                + "SELECT c.posicao, c.id, c.nome, c.nivel, c.xp, c.saldo, c.avatar_url, c.pais, c.estado, c.cidade "
                + "FROM classificados c" + filtroBusca + " ORDER BY c.posicao");
        aplicarParametros(consultaItens, filtro);
        if (padrao != null) {
            consultaItens.setParameter("padrao", padrao);
        }
        consultaItens.setFirstResult(paginaSegura * tamanhoSeguro);
        consultaItens.setMaxResults(tamanhoSeguro);

        List<EntradaRanking> itens = new ArrayList<>();
        for (Object linha : consultaItens.getResultList()) {
            Object[] c = (Object[]) linha;
            itens.add(new EntradaRanking(
                    ((Number) c[0]).longValue(),
                    ((Number) c[1]).longValue(),
                    (String) c[2],
                    ((Number) c[3]).intValue(),
                    ((Number) c[4]).intValue(),
                    ((Number) c[5]).doubleValue(),
                    (String) c[6],
                    (String) c[7],
                    (String) c[8],
                    (String) c[9]));
        }

        long totalParticipantes = contar(filtro, metrica, null);
        long total = padrao == null ? totalParticipantes : contar(filtro, metrica, padrao);
        int totalPaginas = (int) Math.ceil(total / (double) tamanhoSeguro);

        return new PaginaRanking(itens, paginaSegura, tamanhoSeguro, total, totalPaginas,
                totalParticipantes, posicaoDe(filtro, metrica, perfilAtualId));
    }

    /** Posição de um perfil no ranking, ou null se ele não participa. */
    @Transactional(readOnly = true)
    public Long posicaoDe(Filtro filtro, MetricaRanking metrica, Long perfilId) {
        if (perfilId == null) {
            return null;
        }
        Query consulta = em.createNativeQuery(cte(filtro, metrica)
                + "SELECT c.posicao FROM classificados c WHERE c.id = :perfilId");
        aplicarParametros(consulta, filtro);
        consulta.setParameter("perfilId", perfilId);
        List<?> resultado = consulta.getResultList();
        return resultado.isEmpty() ? null : ((Number) resultado.get(0)).longValue();
    }

    private long contar(Filtro filtro, MetricaRanking metrica, String padrao) {
        Query consulta = em.createNativeQuery(cte(filtro, metrica)
                + "SELECT COUNT(*) FROM classificados c"
                + (padrao == null ? "" : " WHERE LOWER(c.nome) LIKE LOWER(:padrao) ESCAPE '!'"));
        aplicarParametros(consulta, filtro);
        if (padrao != null) {
            consulta.setParameter("padrao", padrao);
        }
        return ((Number) consulta.getSingleResult()).longValue();
    }

    // A posição é calculada sobre todos os participantes, antes da busca por nome,
    // para que a busca não mude a colocação de ninguém.
    private String cte(Filtro filtro, MetricaRanking metrica) {
        return "WITH classificados AS ("
                + "SELECT p.id, p.nome, p.nivel, p.xp, COALESCE(p.saldo_virtual, 0) AS saldo, p.avatar_url, "
                + "p.pais, p.estado, p.cidade, "
                + "ROW_NUMBER() OVER (ORDER BY " + metrica.getExpressaoSql() + " DESC, p.id ASC) AS posicao "
                + "FROM perfis p WHERE " + filtro.condicao() + ") ";
    }

    private void aplicarParametros(Query consulta, Filtro filtro) {
        filtro.parametros().forEach(consulta::setParameter);
    }

    /** Transforma o texto digitado em um padrão de LIKE, escapando os curingas. */
    public static String padraoDeBusca(String busca) {
        if (busca == null || busca.isBlank()) {
            return null;
        }
        String texto = busca.trim()
                .replace("!", "!!")
                .replace("%", "!%")
                .replace("_", "!_");
        return "%" + texto + "%";
    }
}
