package com.example.cementerio_api.repository;

import com.example.cementerio_api.entity.CemenUnidadEnterramiento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UnidadEnterramientoRepository extends JpaRepository<CemenUnidadEnterramiento, Integer> {

    List<CemenUnidadEnterramiento> findByBloqueId(Integer bloqueId);
    Optional<CemenUnidadEnterramiento> findByCodigo(String codigo);
}
