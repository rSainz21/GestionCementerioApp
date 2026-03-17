package com.example.cementerio_api.repository;

import com.example.cementerio_api.entity.CemenMovimiento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MovimientoRepository extends JpaRepository<CemenMovimiento, Integer> {
    List<CemenMovimiento> findByRestoId(Integer restoId);
}