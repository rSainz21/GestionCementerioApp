package com.example.cementerio_api.repository;

import com.example.cementerio_api.entity.CemenTitular;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TitularRepository extends JpaRepository<CemenTitular, Integer> {
    Optional<CemenTitular> findByDocumento(String documento);
}
