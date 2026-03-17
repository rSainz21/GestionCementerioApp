package com.example.cementerio_api.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Entity
@Table(name = "cemen_titular")
public class CemenTitular {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "nombre_apellidos", nullable = false, length = 200)
    private String nombreApellidos;

    @Column(unique = true, length = 30)
    private String documento; // DNI/NIE

    @Column(length = 30)
    private String telefono;

    @Column(length = 150)
    private String email;

    private String direccion;
}