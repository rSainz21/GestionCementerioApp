package com.example.cementerio_api.controladores;

import com.example.cementerio_api.entity.CemenTitular;
import com.example.cementerio_api.service.TitularService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;


@RestController
@RequestMapping("/api/titulares")
public class TitularController {

    @Autowired
    private TitularService titularService;

    @PostMapping
    public ResponseEntity<CemenTitular> guardar(@RequestBody CemenTitular titular) {
        return ResponseEntity.ok(titularService.guardar(titular));
    }

    @GetMapping("/documento/{doc}")
    public ResponseEntity<CemenTitular> buscarPorDoc(@PathVariable String doc) {
        return titularService.buscarPorDocumento(doc)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
