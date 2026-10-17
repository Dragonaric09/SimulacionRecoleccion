package com.simulacionem.analitica.presentation.rest;

import com.simulacionem.analitica.application.dto.CompetenceComparisonDto;
import com.simulacionem.analitica.application.service.ComparacionCompetenciasService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;

/** Cruce entre encuestas: titulados frente a empleadores. Sin ids se usa el último dataset de cada tipo. */
@RestController
@RequestMapping("/api/analytics/comparison")
public class ComparacionController {

    private final ComparacionCompetenciasService comparacion;

    public ComparacionController(ComparacionCompetenciasService comparacion) {
        this.comparacion = comparacion;
    }

    @GetMapping("/competencies")
    public CompetenceComparisonDto competencies(@RequestParam(required = false) UUID tituladosDatasetId,
                                                @RequestParam(required = false) UUID empleadoresDatasetId,
                                                @RequestParam(defaultValue = "0.05") double alfa) {
        return comparacion.comparar(tituladosDatasetId, empleadoresDatasetId, alfa);
    }

    @ExceptionHandler(NoSuchElementException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public Map<String, String> notFound(NoSuchElementException ex) {
        return Map.of("error", ex.getMessage());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, String> invalid(IllegalArgumentException ex) {
        return Map.of("error", ex.getMessage());
    }
}
