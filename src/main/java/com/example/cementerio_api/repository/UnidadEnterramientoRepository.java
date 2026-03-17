package com.example.cementerio_api.repository;

import com.example.cementerio_api.entity.CemenUnidadEnterramiento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UnidadEnterramientoRepository extends JpaRepository<CemenUnidadEnterramiento, Integer> {

    List<CemenUnidadEnterramiento> findByBloqueId(Integer bloqueId);

    List<CemenUnidadEnterramiento> findByEstado(String estado);
}
