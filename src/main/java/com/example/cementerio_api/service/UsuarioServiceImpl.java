package com.example.cementerio_api.service;

import com.example.cementerio_api.entity.CemenUsuario;
import com.example.cementerio_api.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class UsuarioServiceImpl implements UsuarioService {

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private PasswordEncoder passwordEncoder; // Herramienta de Spring Security para encriptar

    @Override
    public List<CemenUsuario> listarTodos() {
        return usuarioRepository.findAll();
    }

    @Override
    public Optional<CemenUsuario> buscarPorId(Integer id) {
        return usuarioRepository.findById(id);
    }

    @Override
    public Optional<CemenUsuario> buscarPorUsername(String username) {
        return usuarioRepository.findByUsername(username);
    }

    @Override
    public CemenUsuario registrarUsuario(CemenUsuario usuario) {
        // Encriptamos la contraseña antes de guardarla en la base de datos
        String passEncriptada = passwordEncoder.encode(usuario.getPassword());
        usuario.setPassword(passEncriptada);

        return usuarioRepository.save(usuario);
    }

    @Override
    public void eliminar(Integer id) {
        usuarioRepository.deleteById(id);
    }
}
