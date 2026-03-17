package com.example.cementerio_api.entity;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

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

    @Column(nullable = false)
    private String concepto; // Ej: "Tasa Inhumación", "Mantenimiento anual"

    @Column(nullable = false)
    private java.math.BigDecimal importe;

    @Column(name = "estado_pago", nullable = false)
    private String estadoPago; // Pagado, Pendiente, Impago

    @Column(name = "fecha_emision")
    private java.time.LocalDate fechaEmision;
}