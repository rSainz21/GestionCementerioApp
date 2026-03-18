package com.example.cementerio_api.repository;

import com.example.cementerio_api.entity.CemenDocumento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DocumentoRepository extends JpaRepository<CemenDocumento, Integer> {
    List<CemenDocumento> findByUnidadEnterramientoId(Integer unidadId);
}