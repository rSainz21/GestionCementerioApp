package com.example.cementerio_api.repository;



import com.example.cementerio_api.entity.CemenRestos;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface RestosRepository extends JpaRepository<CemenRestos, Integer> {

    //Busca todos los registros procedentes de libros antiguos que carecen de ubicación física
    List<CemenRestos> findByUnidadIsNull();

    List<CemenRestos> findByNombreApellidosContainingIgnoreCase(String nombre);

    List<CemenRestos> findByUnidadIdOrderByFechaInhumacionDesc(Integer unidadId);
}
