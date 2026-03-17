package com.example.cementerio_api.entity;



import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "cemen_unidad_enterramiento")
public class CemenUnidadEnterramiento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bloque_id", nullable = false)
    private CemenBloque bloque;

    // Código único para correspondencia unívoca papel-terreno
    @Column(nullable = false, unique = true, length = 50)
    private String codigo;

    @Column(nullable = false, length = 50)
    private String tipo; // Nicho, Tumba, Panteón, Columbario

    // Posicionamiento dentro del bloque paramétrico
    private Integer fila;
    private Integer numero;

    // Ocupado, Caducado, Libre, Reservado
    @Column(nullable = false, length = 30)
    private String estado;

    // Coordenadas para que el ciudadano localice el nicho vía GPS móvil
    @Column(precision = 10, scale = 8)
    private BigDecimal latitud;

    @Column(precision = 11, scale = 8)
    private BigDecimal longitud;

    @Column(name = "creado_en", insertable = false, updatable = false)
    private LocalDateTime creadoEn;
}