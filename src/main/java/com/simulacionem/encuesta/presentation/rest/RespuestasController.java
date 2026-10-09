package com.simulacionem.encuesta.presentation.rest;

import com.simulacionem.encuesta.application.service.RespuestaCacheService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class RespuestasController {

    private final RespuestaCacheService respuestaCacheService;

    public RespuestasController(RespuestaCacheService respuestaCacheService) {
        this.respuestaCacheService = respuestaCacheService;
    }

    @GetMapping(value = "/empleadores", produces = "application/json")
    public ResponseEntity<String> respuestasEmpleadores() {
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_JSON)
                .body(respuestaCacheService.obtenerEmpleadores());
    }

    @GetMapping(value = "/empleados", produces = "application/json")
    public ResponseEntity<String> respuestasEmpleados() {
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_JSON)
                .body(respuestaCacheService.obtenerEmpleados());
    }
}
