package com.edufinance.backend.repository;

import com.edufinance.backend.model.RegistroAssinado;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RegistroAssinadoRepository extends JpaRepository<RegistroAssinado, Long> {
    Optional<RegistroAssinado> findTopByOrderByIdDesc();

    Optional<RegistroAssinado> findTopByOrderByIdAsc();

    List<RegistroAssinado> findAllByOrderByIdAsc();

    List<RegistroAssinado> findByUsuarioIdOrderByIdAsc(Long usuarioId);

    @Query("select max(r.sequencia) from RegistroAssinado r where r.chaveId = :chaveId")
    Long ultimaSequencia(@Param("chaveId") Long chaveId);
}
