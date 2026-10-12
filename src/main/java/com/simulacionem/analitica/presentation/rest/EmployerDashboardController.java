package com.simulacionem.analitica.presentation.rest;

import com.simulacionem.analitica.application.dto.CrossTabulationDto;
import com.simulacionem.analitica.application.dto.EmployerDashboardDto;
import com.simulacionem.analitica.application.dto.EmployerResponsePageDto;
import com.simulacionem.analitica.application.service.EmployerDashboardService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;

/** Dashboard de empleadores: agregados y tabla detallada paginada, calculados en la base de datos. */
@RestController
@RequestMapping("/api/analytics/employers")
public class EmployerDashboardController {

    private final EmployerDashboardService dashboard;

    public EmployerDashboardController(EmployerDashboardService dashboard) {
        this.dashboard = dashboard;
    }

    @GetMapping("/dashboard")
    public EmployerDashboardDto dashboard(@RequestParam(required = false) UUID datasetId,
                                          @RequestParam(required = false) List<String> organizationType,
                                          @RequestParam(required = false) List<String> organizationSize) {
        return dashboard.dashboard(datasetId, organizationType, organizationSize);
    }

    @GetMapping("/responses")
    public EmployerResponsePageDto responses(@RequestParam(required = false) UUID datasetId,
                                             @RequestParam(required = false) List<String> organizationType,
                                             @RequestParam(required = false) List<String> organizationSize,
                                             @RequestParam(defaultValue = "0") int page,
                                             @RequestParam(defaultValue = "25") int size,
                                             @RequestParam(defaultValue = "fecha") String sort,
                                             @RequestParam(defaultValue = "desc") String dir) {
        return dashboard.responses(datasetId, organizationType, organizationSize, page, size, sort, dir);
    }

    /** Tabla de contingencia de dos variables de empleadores, con la misma forma que /analytics/crosses. */
    @GetMapping("/cross")
    public CrossTabulationDto cross(@RequestParam(required = false) UUID datasetId,
                                    @RequestParam String rowField,
                                    @RequestParam String columnField,
                                    @RequestParam(required = false) List<String> organizationType,
                                    @RequestParam(required = false) List<String> organizationSize) {
        return dashboard.cross(datasetId, rowField, columnField, organizationType, organizationSize);
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
