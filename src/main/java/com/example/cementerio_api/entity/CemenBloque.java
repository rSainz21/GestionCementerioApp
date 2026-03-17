package com.example.cementerio_api.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@Entity
@Table(name = "cemen_bloque")
public class CemenBloque {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "cementerio_id", nullable = false)
    private Integer cementerioId;

    @Column(nullable = false, length = 100)
    private String nombre;

    @Column(nullable = false)
    private Integer filas;

    @Column(nullable = false)
    private Integer columnas;

    @Column(name = "sentido_numeracion", nullable = false, length = 50)
    private String sentidoNumeracion = "IZQUIERDA_A_DERECHA";

    @CreationTimestamp
    @Column(name = "creado_en", updatable = false)
    private LocalDateTime creadoEn;
}

