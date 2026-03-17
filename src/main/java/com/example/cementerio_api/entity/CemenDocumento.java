package com.example.cementerio_api.entity;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Entity
@Table(name = "cemen_documento")
public class CemenDocumento {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "unidad_id", nullable = false)
    private UnidadEnterramiento unidadEnterramiento;

    @Column(nullable = false, length = 50)
    private String tipo; // "Foto Lápida", "Título", "Acta" [cite: 165, 171]

    @Column(name = "ruta_archivo", nullable = false)
    private String rutaArchivo; // URL o path en servidor
}