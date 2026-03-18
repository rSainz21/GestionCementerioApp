package com.example.cementerio_api.repository;

import com.example.cementerio_api.entity.CemenBloque;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BloqueRepository extends JpaRepository<CemenBloque, Integer> {
    List<CemenBloque> findByCementerioId(Integer cementerioId);
}