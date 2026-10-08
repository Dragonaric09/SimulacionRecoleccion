package com.simulacionem.analitica.presentation.rest;

import com.simulacionem.analitica.application.dto.AnalyticsSummaryDto;
import com.simulacionem.analitica.application.dto.CompetenceAverageDto;
import com.simulacionem.analitica.application.dto.CrossTabulationDto;
import com.simulacionem.analitica.application.service.AnalyticsService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {
    private final AnalyticsService analytics;

    public AnalyticsController(AnalyticsService analytics) { this.analytics = analytics; }

    @GetMapping("/titulados/summary")
    public AnalyticsSummaryDto tituladosSummary(@RequestParam(required = false) UUID datasetId,
                                                @RequestParam(required = false) String fields) {
        return analytics.summary(datasetId, "TITULADOS", split(fields));
    }

    @GetMapping("/titulados/employment")
    public AnalyticsSummaryDto tituladosEmployment(@RequestParam(required = false) UUID datasetId) {
        return analytics.summary(datasetId, "TITULADOS", List.of("situacion_laboral_actual", "sector_trabajo"));
    }

    @GetMapping("/titulados/education")
    public AnalyticsSummaryDto tituladosEducation(@RequestParam(required = false) UUID datasetId) {
        return analytics.summary(datasetId, "TITULADOS", List.of("tiene_formacion_complementaria", "interes_posgrado"));
    }

    @GetMapping("/employers/summary")
    public AnalyticsSummaryDto employersSummary(@RequestParam(required = false) UUID datasetId,
                                                @RequestParam(required = false) String fields) {
        return analytics.summary(datasetId, "EMPLEADORES", split(fields));
    }

    @GetMapping("/employers/valuation")
    public AnalyticsSummaryDto employersValuation(@RequestParam(required = false) UUID datasetId) {
        List<String> fields = new java.util.ArrayList<>();
        for (int i = 1; i <= 10; i++) fields.add("valoracion_formacion_" + i);
        for (int i = 1; i <= 8; i++) fields.add("valoracion_relacion_" + i);
        return analytics.summary(datasetId, "EMPLEADORES", fields);
    }

    @GetMapping("/competencies/gaps")
    public List<CompetenceAverageDto> competenceGaps(@RequestParam UUID datasetId) {
        return analytics.competenceGaps(datasetId);
    }

    @GetMapping("/crosses")
    public CrossTabulationDto crosses(@RequestParam UUID datasetId,
                                      @RequestParam String rowField,
                                      @RequestParam String columnField) {
        return analytics.cross(datasetId, rowField, columnField);
    }

    private List<String> split(String fields) {
        return fields == null || fields.isBlank() ? List.of() : Arrays.stream(fields.split(",")).map(String::trim).filter(s -> !s.isBlank()).toList();
    }
}
