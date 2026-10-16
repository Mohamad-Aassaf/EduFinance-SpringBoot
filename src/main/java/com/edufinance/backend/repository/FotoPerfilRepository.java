package com.edufinance.backend.repository;

import com.edufinance.backend.model.FotoPerfil;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FotoPerfilRepository extends JpaRepository<FotoPerfil, Long> {
}
