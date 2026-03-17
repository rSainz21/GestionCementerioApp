package com.example.cementerio_api.controladores;


import com.example.cementerio_api.entity.CemenTasaEconomica;
import com.example.cementerio_api.service.TasaEconomicaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/tasas-economicas")
public class TasaEconomicaController {

    @Autowired
    private TasaEconomicaService tasaService;

    @GetMapping
    public ResponseEntity<List<CemenTasaEconomica>> listarTodas() {
        return ResponseEntity.ok(tasaService.listarTodas());
    }

    @GetMapping("/impagos")
    public ResponseEntity<List<CemenTasaEconomica>> listarImpagos() {
        return ResponseEntity.ok(tasaService.listarImpagos());
    }

    @PostMapping
    public ResponseEntity<CemenTasaEconomica> crear(@RequestBody CemenTasaEconomica tasa) {
        return ResponseEntity.ok(tasaService.guardar(tasa));
    }

    @PutMapping("/{id}/pagar")
    public ResponseEntity<CemenTasaEconomica> pagar(@PathVariable Integer id) {
        return ResponseEntity.ok(tasaService.procesarPago(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Integer id) {
        tasaService.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
