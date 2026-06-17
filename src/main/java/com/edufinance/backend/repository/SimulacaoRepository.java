package com.edufinance.backend.repository;

import com.edufinance.backend.model.Simulacao;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SimulacaoRepository extends JpaRepository<Simulacao, Long> {
    List<Simulacao> findByUsuarioId(Long usuarioId);
    List<Simulacao> findByUsuarioIdAndTipoInvestimento(Long usuarioId, String tipoInvestimento);
}
