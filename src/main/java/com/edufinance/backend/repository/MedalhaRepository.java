package com.edufinance.backend.repository;

import com.edufinance.backend.model.Medalha;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface MedalhaRepository extends JpaRepository<Medalha, Long> {
    List<Medalha> findByUsuarioId(Long usuarioId);
    Optional<Medalha> findByUsuarioIdAndTipoMedalha(Long usuarioId, String tipoMedalha);
}
