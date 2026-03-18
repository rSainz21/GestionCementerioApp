package com.example.cementerio_api.service;

import com.example.cementerio_api.entity.CemenUsuario;

import java.util.List;
import java.util.Optional;

public interface UsuarioService {
    List<CemenUsuario> listarTodos();
    Optional<CemenUsuario> buscarPorId(Integer id);
    Optional<CemenUsuario> buscarPorUsername(String username);
    CemenUsuario registrarUsuario(CemenUsuario usuario);
    CemenUsuario actualizar(Integer id, CemenUsuario usuario);
    void eliminar(Integer id);
}
