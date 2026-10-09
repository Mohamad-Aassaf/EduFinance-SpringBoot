package com.edufinance.backend.repository;

import com.edufinance.backend.model.GrupoRanking;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface GrupoRankingRepository extends JpaRepository<GrupoRanking, Long> {
    Optional<GrupoRanking> findByCodigoConvite(String codigoConvite);

    boolean existsByCodigoConvite(String codigoConvite);

    // Grupos que aparecem na busca: todos menos os que só aceitam convite
    @Query("""
            SELECT g FROM GrupoRanking g
            WHERE g.acesso <> 'CONVITE'
              AND LOWER(g.nome) LIKE LOWER(:padrao) ESCAPE '!'
            ORDER BY g.criadoEm DESC, g.id DESC
            """)
    Page<GrupoRanking> buscarVisiveis(@Param("padrao") String padrao, Pageable pageable);
}
