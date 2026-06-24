package com.edufinance.backend.repository;

import com.edufinance.backend.model.Licao;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface LicaoRepository extends JpaRepository<Licao, Long> {
    List<Licao> findByModulo(String modulo);
}
