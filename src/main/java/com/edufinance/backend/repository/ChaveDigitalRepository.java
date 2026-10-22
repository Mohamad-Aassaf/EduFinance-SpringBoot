package com.edufinance.backend.repository;

import com.edufinance.backend.model.ChaveDigital;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChaveDigitalRepository extends JpaRepository<ChaveDigital, Long> {
    Optional<ChaveDigital> findFirstByUsuarioIdAndTipoAndStatus(Long usuarioId, String tipo, String status);

    Optional<ChaveDigital> findFirstByTipoAndStatus(String tipo, String status);

    List<ChaveDigital> findByUsuarioIdOrderByCriadaEmDesc(Long usuarioId);

    List<ChaveDigital> findByTipoAndStatusInOrderByCriadaEmDesc(String tipo, List<String> status);

    boolean existsByUsuarioId(Long usuarioId);

    boolean existsByChavePublica(String chavePublica);
}
