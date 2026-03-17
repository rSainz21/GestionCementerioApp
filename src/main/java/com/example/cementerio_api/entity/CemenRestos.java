package com.example.cementerio_api.entity;


import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "cemen_restos")
public class CemenRestos {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    /* Es NULLABLE (puede ser nulo) para permitir que el registro exista
     * en la "Bandeja de Regularización" hasta que el operario lo ubique
     * en el campo con la App.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "unidad_id")
    private CemenUnidadEnterramiento unidad;

    @Column(name = "nombre_apellidos", nullable = false, length = 200)
    private String nombreApellidos;

    @Column(name = "fecha_inhumacion")
    private LocalDate fechaInhumacion;

    @Column(length = 150)
    private String procedencia;

    @Column(name = "notas_historicas", columnDefinition = "TEXT")
    private String notasHistoricas; // Para tachaduras o notas manuscritas detectadas

    @Column(name = "creado_en", insertable = false, updatable = false)
    private LocalDateTime creadoEn;
}