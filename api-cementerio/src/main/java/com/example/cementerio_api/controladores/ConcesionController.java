package com.example.cementerio_api.controladores;

import com.example.cementerio_api.entity.CemenConcesion;
import com.example.cementerio_api.entity.CemenTitular;
import com.example.cementerio_api.service.ConcesionService;
import com.example.cementerio_api.service.TitularService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/concesiones")
public class ConcesionController {

    @Autowired
    private ConcesionService concesionService;

    @GetMapping("/alertas")
    public ResponseEntity<List<CemenConcesion>> alertasCaducidad(@RequestParam int meses) {
        return ResponseEntity.ok(concesionService.listarAlertasCaducidad(meses));
    }

    @GetMapping("/unidad/{unidadId}")
    public ResponseEntity<List<CemenConcesion>> porUnidad(@PathVariable Integer unidadId) {
        return ResponseEntity.ok(concesionService.historialPorUnidad(unidadId));
    }
}
