package com.edufinance.backend.repository;

import com.edufinance.backend.model.GrupoMembro;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GrupoMembroRepository extends JpaRepository<GrupoMembro, Long> {
    Optional<GrupoMembro> findByGrupoIdAndPerfilId(Long grupoId, Long perfilId);

    long countByGrupoId(Long grupoId);

    long countByGrupoIdAndPapel(Long grupoId, String papel);

    @Query("SELECT m FROM GrupoMembro m JOIN FETCH m.perfil WHERE m.grupo.id = :grupoId ORDER BY m.entrouEm ASC, m.id ASC")
    List<GrupoMembro> listarDoGrupo(@Param("grupoId") Long grupoId);

    @Query("SELECT m FROM GrupoMembro m JOIN FETCH m.grupo WHERE m.perfil.id = :perfilId ORDER BY m.entrouEm DESC, m.id DESC")
    List<GrupoMembro> listarDoPerfil(@Param("perfilId") Long perfilId);
}
