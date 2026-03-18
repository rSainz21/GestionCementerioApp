package com.example.cementerio_api.controladores;



import com.example.cementerio_api.entity.CemenRestos;
import com.example.cementerio_api.service.RestosService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/restos")
public class RestosController {

    @Autowired
    private RestosService restosService;

    // Obtener registros de libros antiguos sin ubicación física
    @GetMapping("/huerfanos")
    public List<CemenRestos> getHuerfanos() {
        return restosService.listarHuerfanos();
    }

    @PutMapping("/{restoId}/vincular/{unidadId}")
    public CemenRestos vincularANicho(@PathVariable Integer restoId, @PathVariable Integer unidadId) {
        return restosService.vincularANicho(restoId, unidadId);
    }
    @PostMapping
    public CemenRestos crearResto(@RequestBody CemenRestos resto) {
        return restosService.guardar(resto);
    }
    @GetMapping("/buscar")
    public List<CemenRestos> buscar(@RequestParam String nombre) {
        return restosService.buscarPorNombre(nombre);
    }
}