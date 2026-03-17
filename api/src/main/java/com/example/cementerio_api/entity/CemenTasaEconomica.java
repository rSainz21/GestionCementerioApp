package com.example.cementerio_api.entity;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;


import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@Entity
@Table(name = "cemen_tasa_economica")
public class CemenTasaEconomica {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "unidad_id", nullable = false)
    private CemenUnidadEnterramiento unidad;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "titular_id", nullable = false)
    private CemenTitular titular;

    @Column(nullable = false, length = 150)
    private String concepto; // Ej: "Mantenimiento anual", "Tasa Inhumación"

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal importe;

    @Column(name = "estado_pago", nullable = false, length = 30)
    private String estadoPago; // "PAGADO", "PENDIENTE", "IMPAGO"

    @Column(name = "fecha_emision", nullable = false)
    private LocalDate fechaEmision;

    @Column(name = "fecha_pago")
    private LocalDate fechaPago;

    @CreationTimestamp
    @Column(name = "creado_en", updatable = false)
    private LocalDateTime creadoEn;
}