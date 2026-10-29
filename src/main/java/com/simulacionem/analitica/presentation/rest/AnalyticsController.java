package com.simulacionem.analitica.presentation.rest;

import com.simulacionem.analitica.application.dto.AnalyticsSummaryDto;
import com.simulacionem.analitica.application.dto.CompetenceAverageDto;
import com.simulacionem.analitica.application.dto.CrossTabulationDto;
import com.simulacionem.analitica.application.dto.EmployerCrossDto;
import com.simulacionem.analitica.application.dto.EmploymentProfileDto;
import com.simulacionem.analitica.application.dto.EmploymentDashboardDto;
import com.simulacionem.analitica.application.dto.TituladosCrossDto;
import com.simulacionem.analitica.application.service.AnalyticsService;
import com.simulacionem.analitica.application.service.TituladosFilter;
import com.simulacionem.analitica.application.service.TituladosCrossService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.NoSuchElementException;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {
    private final AnalyticsService analytics;
    private final TituladosCrossService tituladosCrosses;

    public AnalyticsController(AnalyticsService analytics, TituladosCrossService tituladosCrosses) {
        this.analytics = analytics;
        this.tituladosCrosses = tituladosCrosses;
    }

    @GetMapping("/titulados/summary")
    public AnalyticsSummaryDto tituladosSummary(@RequestParam(required = false) UUID datasetId,
                                                @RequestParam(required = false) String fields,
                                                @ModelAttribute TituladosQuery query) {
        return analytics.summary(datasetId, "TITULADOS", split(fields), query.toFilter());
    }

    @GetMapping("/titulados/employment")
    public AnalyticsSummaryDto tituladosEmployment(@RequestParam(required = false) UUID datasetId,
                                                   @ModelAttribute TituladosQuery query) {
        return analytics.summary(datasetId, "TITULADOS", List.of(
                "anio_titulacion", "anios_vida_profesional", "anios_desempleo",
                "situacion_laboral_actual", "sector_trabajo", "sector_trabajo_actual", "es_primer_empleo", "primera_experiencia_laboral",
                "razon_no_trabaja", "experiencia_laboral_previa", "tiempo_primer_empleo", "cantidad_empleos",
                "edad_rango", "genero", "rubro_trabajo_actual", "remuneracion_rango",
                "area_trabajo", "pertinencia_trabajo_formacion"), query.toFilter());
    }

    @GetMapping("/titulados/employment/dashboard")
    public EmploymentDashboardDto tituladosEmploymentDashboard(@RequestParam(required = false) UUID datasetId,
                                                                @ModelAttribute TituladosQuery query) {
        return analytics.employmentDashboard(datasetId, query.toFilter());
    }

    @GetMapping("/titulados/employment/unemployment")
    public AnalyticsSummaryDto tituladosUnemployment(@RequestParam(required = false) UUID datasetId,
                                                     @ModelAttribute TituladosQuery query) {
        return analytics.unemploymentSummary(datasetId, query.toFilter());
    }

    @GetMapping("/titulados/employment/first-employment")
    public AnalyticsSummaryDto tituladosFirstEmployment(@RequestParam(required = false) UUID datasetId,
                                                        @ModelAttribute TituladosQuery query) {
        return analytics.firstEmploymentSummary(datasetId, query.toFilter());
    }

    @GetMapping("/titulados/employment/entrepreneurship")
    public AnalyticsSummaryDto tituladosEntrepreneurship(@RequestParam(required = false) UUID datasetId,
                                                         @ModelAttribute TituladosQuery query) {
        return analytics.entrepreneurshipSummary(datasetId, query.toFilter());
    }

    @GetMapping("/titulados/employment/profile")
    public EmploymentProfileDto tituladosEmploymentProfile(@RequestParam(required = false) UUID datasetId,
                                                           @ModelAttribute TituladosQuery query) {
        return analytics.employmentProfile(datasetId, query.toFilter());
    }

    @GetMapping("/titulados/education")
    public AnalyticsSummaryDto tituladosEducation(@RequestParam(required = false) UUID datasetId,
                                                  @ModelAttribute TituladosQuery query) {
        return analytics.summary(datasetId, "TITULADOS", List.of(
                "tiene_formacion_complementaria", "formacion_complementaria_nivel",
                "institucion_formacion_complementaria", "financiamiento_posgrado_cursado",
                "interes_posgrado", "nivel_posgrado_interes", "area_posgrado_interes",
                "modalidad_posgrado", "institucion_posgrado_interes", "financiamiento_posgrado_estimado",
                "valoracion_formacion_1"), query.toFilter());
    }

    @GetMapping("/titulados/satisfaction")
    public AnalyticsSummaryDto tituladosSatisfaction(@RequestParam(required = false) UUID datasetId,
                                                     @ModelAttribute TituladosQuery query) {
        return analytics.summary(datasetId, "TITULADOS", List.of(
                "satisfaccion_formacion", "concordancia_formacion_requerimientos",
                "pertinencia_trabajo_formacion", "satisfaccion_emprendimiento",
                "importancia_formacion_emprendimiento"), query.toFilter());
    }

    @GetMapping("/titulados/curriculum")
    public AnalyticsSummaryDto tituladosCurriculum(@RequestParam(required = false) UUID datasetId,
                                                   @ModelAttribute TituladosQuery query) {
        return analytics.summary(datasetId, "TITULADOS", List.of(
                "aspectos_utiles", "aspectos_mejorables", "asignaturas_ventaja", "asignaturas_poco_utiles"), query.toFilter());
    }

    @GetMapping("/titulados/financing")
    public AnalyticsSummaryDto tituladosFinancing(@RequestParam(required = false) UUID datasetId,
                                                  @ModelAttribute TituladosQuery query) {
        return analytics.summary(datasetId, "TITULADOS", List.of(
                "financiamiento_posgrado_estimado", "nivel_posgrado_interes"), query.toFilter());
    }

    @GetMapping("/employers/summary")
    public AnalyticsSummaryDto employersSummary(@RequestParam(required = false) UUID datasetId,
                                                @RequestParam(required = false) String fields,
                                                @RequestParam(required = false) List<String> organizationType,
                                                @RequestParam(required = false) List<String> organizationSize) {
        return analytics.summary(datasetId, "EMPLEADORES", split(fields),
                TituladosFilter.organization(organizationType, organizationSize));
    }

    @GetMapping("/employers/valuation")
    public AnalyticsSummaryDto employersValuation(@RequestParam(required = false) UUID datasetId,
                                                  @RequestParam(required = false) List<String> organizationType,
                                                  @RequestParam(required = false) List<String> organizationSize) {
        List<String> fields = new java.util.ArrayList<>();
        for (int i = 1; i <= 10; i++) fields.add("valoracion_formacion_" + i);
        for (int i = 1; i <= 8; i++) fields.add("valoracion_relacion_" + i);
        return analytics.summary(datasetId, "EMPLEADORES", fields,
                TituladosFilter.organization(organizationType, organizationSize));
    }

    @GetMapping("/competencies/gaps")
    public List<CompetenceAverageDto> competenceGaps(@RequestParam UUID datasetId,
                                                     @ModelAttribute TituladosQuery query) {
        return analytics.competenceGaps(datasetId, query.toFilter());
    }

    @GetMapping("/crosses")
    public CrossTabulationDto crosses(@RequestParam UUID datasetId,
                                      @RequestParam String rowField,
                                      @RequestParam String columnField,
                                      @ModelAttribute TituladosQuery query) {
        return analytics.cross(datasetId, rowField, columnField, query.toFilter());
    }

    /** Variables de titulados aptas para una prueba bivariada, con nivel de medición y orden de la escala. */
    @GetMapping("/titulados/catalog")
    public List<EmployerCrossDto.VariableDto> tituladosCatalog() {
        return tituladosCrosses.catalog();
    }

    /** Cruce de titulados con la prueba elegida por el nivel de medición de las dos variables. */
    @GetMapping("/titulados/cross")
    public TituladosCrossDto tituladosCross(@RequestParam UUID datasetId,
                                            @RequestParam String rowField,
                                            @RequestParam String columnField,
                                            @ModelAttribute TituladosQuery query) {
        return tituladosCrosses.cross(datasetId, query.toFilter(), rowField, columnField);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, String> invalidRequest(IllegalArgumentException ex) {
        return Map.of("error", ex.getMessage());
    }

    @ExceptionHandler(NoSuchElementException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public Map<String, String> datasetNotFound(NoSuchElementException ex) {
        return Map.of("error", "El dataset solicitado no existe o fue eliminado");
    }

    private List<String> split(String fields) {
        return fields == null || fields.isBlank() ? List.of() : Arrays.stream(fields.split(",")).map(String::trim).filter(s -> !s.isBlank()).toList();
    }
}
