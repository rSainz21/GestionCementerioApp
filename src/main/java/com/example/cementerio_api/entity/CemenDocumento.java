package com.example.cementerio_api.entity;
import com.fasterxml.jackson.annotation.JsonProperty;
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
    private CemenUnidadEnterramiento unidadEnterramiento;

    @Column(nullable = false, length = 50)
    @JsonProperty("tipoDocumento")
    private String tipo;

    @Column(name = "ruta_archivo", nullable = false)
    @JsonProperty("urlArchivo")
    private String rutaArchivo;
}