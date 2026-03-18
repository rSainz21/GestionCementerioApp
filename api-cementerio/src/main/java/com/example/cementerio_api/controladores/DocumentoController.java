package com.example.cementerio_api.controladores;

import com.example.cementerio_api.entity.CemenDocumento;
import com.example.cementerio_api.service.DocumentoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/documentos")
public class DocumentoController {

    @Autowired
    private DocumentoService documentoService;

    @GetMapping("/unidad/{uId}")
    public ResponseEntity<List<CemenDocumento>> porUnidad(@PathVariable Integer uId) {
        return ResponseEntity.ok(documentoService.listarPorUnidad(uId));
    }

    @PostMapping
    public ResponseEntity<CemenDocumento> guardar(@RequestBody CemenDocumento documento) {
        return ResponseEntity.ok(documentoService.guardar(documento));
    }
}
