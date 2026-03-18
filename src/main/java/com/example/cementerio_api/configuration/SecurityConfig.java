package com.example.cementerio_api.configuration;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // 1. Desactivamos CSRF porque para APIs REST con tokens no es necesario
                // y bloquea las peticiones POST de Postman.
                .csrf(csrf -> csrf.disable())

                // 2. Configuramos los permisos de las rutas
                .authorizeHttpRequests(auth -> auth
                        // Permitimos acceso libre a TODO lo que empiece por /api/usuarios/
                        // para que puedas registrar y listar sin estar logueado aún.
                        .requestMatchers("/api/usuarios/**").permitAll()
                        // El resto de la API seguirá pidiendo autenticación
                        .anyRequest().authenticated()
                );

        return http.build();
    }
}
