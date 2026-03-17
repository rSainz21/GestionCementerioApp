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
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cementerio_id", nullable = false)
    private CemenCementerio cementerio;
    private String nombre;
    private Integer filas;
    private Integer columnas;
    @Column(name = "sentido_numeracion")
    private String sentidoNumeracion;
}

