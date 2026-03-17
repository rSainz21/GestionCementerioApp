package com.example.cementerio_api.repository;



import com.example.cementerio_api.entity.CemenCementerio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CementerioRepository extends JpaRepository<CemenCementerio, Integer> {

    Optional<CemenCementerio> findByNombreIgnoreCase(String nombre);
}