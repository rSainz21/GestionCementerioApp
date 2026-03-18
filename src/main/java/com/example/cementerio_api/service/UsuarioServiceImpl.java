package com.example.cementerio_api.service;

import com.example.cementerio_api.entity.CemenUsuario;
import com.example.cementerio_api.repository.UsuarioRepository;
import jakarta.transaction.Transactional;
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
    @Transactional
    public CemenUsuario actualizar(Integer id, CemenUsuario datosNuevos) {
        CemenUsuario usuarioExistente = usuarioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado con ID: " + id));

        // Actualizamos el nombre de usuario (username)
        usuarioExistente.setUsername(datosNuevos.getUsername());

        // Actualizamos el rol (ADMIN, OPERARIO, etc.)
        usuarioExistente.setRol(datosNuevos.getRol());

        // LOGICA DE CONTRASEÑA: Solo si el JSON trae una contraseña, la encriptamos y cambiamos
        if (datosNuevos.getPassword() != null && !datosNuevos.getPassword().isEmpty()) {
            String passEncriptada = passwordEncoder.encode(datosNuevos.getPassword());
            usuarioExistente.setPassword(passEncriptada);
        }

        return usuarioRepository.save(usuarioExistente);
    }

    @Override
    public void eliminar(Integer id) {
        usuarioRepository.deleteById(id);
    }
}
