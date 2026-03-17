package com.example.cementerio_api.repository;

import com.example.cementerio_api.entity.CemenTasaEconomica;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TasaEconomicaRepository extends JpaRepository<CemenTasaEconomica, Integer> {

    List<CemenTasaEconomica> findByEstadoPago(String estado);

    List<CemenTasaEconomica> findByUnidadId(Integer unidadId);

    List<CemenTasaEconomica> findByTitularId(Integer titularId);

    List<CemenTasaEconomica> findByConceptoContaining(String concepto);
}
