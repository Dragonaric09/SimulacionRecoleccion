package com.simulacionem.encuesta.presentation.rest;

import com.fasterxml.jackson.databind.JsonNode;
import com.simulacionem.encuesta.application.service.EncuestaImportService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/import")
public class EncuestaImportController {

    private final EncuestaImportService encuestaImportService;

    public EncuestaImportController(EncuestaImportService encuestaImportService) {
        this.encuestaImportService = encuestaImportService;
    }

    @PostMapping("/titulados")
    @ResponseStatus(HttpStatus.CREATED)
    public EncuestaImportService.ResultadoImportacion importarTitulados(@RequestBody JsonNode payload) {
        return encuestaImportService.importarTitulados(payload);
    }

    @PostMapping("/empleadores")
    @ResponseStatus(HttpStatus.CREATED)
    public EncuestaImportService.ResultadoImportacion importarEmpleadores(@RequestBody JsonNode payload) {
        return encuestaImportService.importarEmpleadores(payload);
    }
}