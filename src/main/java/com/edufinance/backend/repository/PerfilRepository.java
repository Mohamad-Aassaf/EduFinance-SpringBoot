package com.edufinance.backend.repository;

import com.edufinance.backend.model.Perfil;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface PerfilRepository extends JpaRepository<Perfil, Long> {
    Optional<Perfil> findByEmail(String email);
    List<Perfil> findAllByOrderByXpDesc();
}
