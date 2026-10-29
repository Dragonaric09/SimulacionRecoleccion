package com.simulacionem.analitica.presentation.rest;

import com.simulacionem.analitica.application.service.EscenarioSimulacionService;
import com.simulacionem.analitica.application.service.EscenarioSimulacionService.Scenario;
import com.simulacionem.analitica.application.service.EscenarioSimulacionService.ScenarioRequest;
import com.simulacionem.analitica.application.service.SimulacionMultinomialService;
import com.simulacionem.analitica.application.service.SimulacionMultinomialService.ComparisonRequest;
import com.simulacionem.analitica.application.service.SimulacionMultinomialService.ScenarioComparison;
import com.simulacionem.analitica.application.service.SimulacionMultinomialService.SimulationRequest;
import com.simulacionem.analitica.application.service.SimulacionMultinomialService.SimulationResult;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Simulación Monte Carlo de escenarios y escenarios guardados con nombre. */
@RestController
@RequestMapping("/api/analytics/simulation")
public class SimulacionController {

    private final SimulacionMultinomialService simulacion;
    private final EscenarioSimulacionService escenarios;

    public SimulacionController(SimulacionMultinomialService simulacion, EscenarioSimulacionService escenarios) {
        this.simulacion = simulacion;
        this.escenarios = escenarios;
    }

    @PostMapping("/multinomial")
    public SimulationResult simulation(@RequestBody SimulationRequest request) {
        return simulacion.simular(request);
    }

    /** Escenario ajustado contra el base con los mismos números aleatorios. */
    @PostMapping("/compare")
    public ScenarioComparison compare(@RequestBody ComparisonRequest request) {
        return simulacion.comparar(request);
    }

    @GetMapping("/scenarios")
    public List<Scenario> scenarios(@RequestParam(required = false) String variable) {
        return escenarios.listar(variable);
    }

    @PostMapping("/scenarios")
    @ResponseStatus(HttpStatus.CREATED)
    public Scenario saveScenario(@RequestBody ScenarioRequest request) {
        return escenarios.guardar(request);
    }

    @DeleteMapping("/scenarios/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteScenario(@PathVariable UUID id) {
        escenarios.eliminar(id);
    }

    @ExceptionHandler(DuplicateKeyException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public Map<String, String> duplicated(DuplicateKeyException ex) {
        return Map.of("error", "Ya existe un escenario con ese nombre para esta variable");
    }
}
