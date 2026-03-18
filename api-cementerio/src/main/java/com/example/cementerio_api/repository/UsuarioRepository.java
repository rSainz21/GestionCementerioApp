package com.example.cementerio_api.repository;

import com.example.cementerio_api.entity.CemenUsuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UsuarioRepository extends JpaRepository<CemenUsuario, Integer> {
    Optional<CemenUsuario> findByUsername(String username);
}