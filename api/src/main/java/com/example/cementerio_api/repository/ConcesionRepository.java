package com.example.cementerio_api.repository;

import com.example.cementerio_api.entity.CemenConcesion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface ConcesionRepository extends JpaRepository<CemenConcesion, Integer> {

    // Busca las concesiones de un nicho específico
    List<CemenConcesion> findByUnidadEnterramientoId(Integer unidadId);

    // MAGIA PARA AVISOS: Busca concesiones que caducan antes de una fecha y siguen vigentes
    @Query("SELECT c FROM Concesion c WHERE c.fechaVencimiento <= :fecha AND c.estado = 'Vigente'")
    List<CemenConcesion> findProximosVencimientos(LocalDate fecha);
}
