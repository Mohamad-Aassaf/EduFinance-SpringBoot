package com.edufinance.backend.repository;

import com.edufinance.backend.model.ProgressoUsuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ProgressoUsuarioRepository extends JpaRepository<ProgressoUsuario, Long> {
    List<ProgressoUsuario> findByUsuarioId(Long usuarioId);
    Optional<ProgressoUsuario> findByUsuarioIdAndLicaoId(Long usuarioId, Long licaoId);
    long countByUsuarioIdAndConcluidoTrue(Long usuarioId);
}
