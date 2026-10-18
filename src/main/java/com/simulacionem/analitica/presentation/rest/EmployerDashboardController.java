package com.simulacionem.analitica.presentation.rest;

import com.simulacionem.analitica.application.dto.EmployerCrossDto;
import com.simulacionem.analitica.application.dto.EmployerDashboardDto;
import com.simulacionem.analitica.application.dto.EmployerResponsePageDto;
import com.simulacionem.analitica.application.dto.EmployerValuationDto;
import com.simulacionem.analitica.application.service.EmployerCrossService;
import com.simulacionem.analitica.application.service.EmployerDashboardService;
import com.simulacionem.analitica.application.service.EmployerValuationService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

/** Sección Empleadores: agregados, tabla detallada, valoración por dimensiones y cruces, calculados en la base de datos. */
@RestController
@RequestMapping("/api/analytics/employers")
public class EmployerDashboardController {

    private final EmployerDashboardService dashboard;
    private final EmployerValuationService valuation;
    private final EmployerCrossService crosses;

    public EmployerDashboardController(EmployerDashboardService dashboard, EmployerValuationService valuation,
                                       EmployerCrossService crosses) {
        this.dashboard = dashboard;
        this.valuation = valuation;
        this.crosses = crosses;
    }

    @GetMapping("/dashboard")
    public EmployerDashboardDto dashboard(@ModelAttribute EmployerQuery query) {
        return dashboard.dashboard(query.toFilters());
    }

    @GetMapping("/responses")
    public EmployerResponsePageDto responses(@ModelAttribute EmployerQuery query,
                                             @RequestParam(defaultValue = "0") int page,
                                             @RequestParam(defaultValue = "25") int size,
                                             @RequestParam(defaultValue = "fecha") String sort,
                                             @RequestParam(defaultValue = "desc") String dir) {
        return dashboard.responses(query.toFilters(), page, size, sort, dir);
    }

    @GetMapping("/valuation-insights")
    public EmployerValuationDto valuationInsights(@ModelAttribute EmployerQuery query) {
        return valuation.insights(query.toFilters());
    }

    /** Variables cruzables con su nivel de medición, orden de categorías y gráfico recomendado. */
    @GetMapping("/catalog")
    public List<EmployerCrossDto.VariableDto> catalog() {
        return crosses.catalog();
    }

    /** Tabla de contingencia de dos variables con la prueba elegida según su nivel de medición. */
    @GetMapping("/cross")
    public EmployerCrossDto cross(@ModelAttribute EmployerQuery query,
                                  @RequestParam String rowField,
                                  @RequestParam String columnField) {
        return crosses.cross(query.toFilters(), rowField, columnField);
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
