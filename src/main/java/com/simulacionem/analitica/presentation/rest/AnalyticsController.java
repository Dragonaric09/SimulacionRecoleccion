package com.simulacionem.analitica.presentation.rest;

import com.simulacionem.analitica.application.dto.AnalyticsSummaryDto;
import com.simulacionem.analitica.application.dto.CompetenceAverageDto;
import com.simulacionem.analitica.application.dto.CrossTabulationDto;
import com.simulacionem.analitica.application.dto.EmploymentProfileDto;
import com.simulacionem.analitica.application.service.AnalyticsService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.NoSuchElementException;
import java.util.Map;
import java.util.Random;
import java.util.ArrayList;
import java.util.stream.IntStream;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;

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
        return analytics.summary(datasetId, "TITULADOS", List.of(
                "anio_titulacion", "anios_vida_profesional", "anios_desempleo",
                "situacion_laboral_actual", "sector_trabajo", "primera_experiencia_laboral",
                "edad_rango", "genero", "rubro_trabajo_actual", "remuneracion_rango",
                "area_trabajo", "pertinencia_trabajo_formacion"));
    }

    @GetMapping("/titulados/employment/profile")
    public EmploymentProfileDto tituladosEmploymentProfile(@RequestParam(required = false) UUID datasetId) {
        return analytics.employmentProfile(datasetId);
    }

    @GetMapping("/titulados/education")
    public AnalyticsSummaryDto tituladosEducation(@RequestParam(required = false) UUID datasetId) {
        return analytics.summary(datasetId, "TITULADOS", List.of("tiene_formacion_complementaria", "interes_posgrado"));
    }

    @GetMapping("/titulados/satisfaction")
    public AnalyticsSummaryDto tituladosSatisfaction(@RequestParam(required = false) UUID datasetId) {
        return analytics.summary(datasetId, "TITULADOS", List.of(
                "satisfaccion_formacion", "concordancia_formacion_requerimientos",
                "pertinencia_trabajo_formacion"));
    }

    @GetMapping("/titulados/curriculum")
    public AnalyticsSummaryDto tituladosCurriculum(@RequestParam(required = false) UUID datasetId) {
        return analytics.summary(datasetId, "TITULADOS", List.of(
                "aspectos_utiles", "aspectos_mejorables", "asignaturas_ventaja", "asignaturas_poco_utiles"));
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

    @PostMapping("/simulation/multinomial")
    public SimulationResult simulation(@RequestBody SimulationRequest request) {
        if (request.categories() == null || request.probabilities() == null
                || request.categories().size() != request.probabilities().size()
                || request.categories().isEmpty() || request.sampleSize() < 1
                || request.repetitions() < 1) {
            throw new IllegalArgumentException("Las categorías, probabilidades, tamaño y repeticiones son obligatorios y válidos");
        }
        double total = request.probabilities().stream().mapToDouble(Double::doubleValue).sum();
        if (request.probabilities().stream().anyMatch(value -> value < 0) || Math.abs(total - 1.0) > 0.0001) {
            throw new IllegalArgumentException("Las probabilidades deben ser no negativas y sumar 1");
        }
        Random random = new Random(request.seed());
        double[] sums = new double[request.categories().size()];
        double[] squares = new double[request.categories().size()];
        double[] cumulative = new double[request.probabilities().size()];
        double running = 0;
        for (int i = 0; i < request.probabilities().size(); i++) {
            running += request.probabilities().get(i);
            cumulative[i] = running;
        }
        for (int repetition = 0; repetition < request.repetitions(); repetition++) {
            int[] counts = new int[request.categories().size()];
            for (int draw = 0; draw < request.sampleSize(); draw++) {
                double value = random.nextDouble();
                int category = IntStream.range(0, cumulative.length).filter(index -> value <= cumulative[index]).findFirst().orElse(cumulative.length - 1);
                counts[category]++;
            }
            for (int i = 0; i < counts.length; i++) { sums[i] += counts[i] * 100.0 / request.sampleSize(); squares[i] += Math.pow(counts[i] * 100.0 / request.sampleSize(), 2); }
        }
        List<SimulationCategory> result = new ArrayList<>();
        for (int i = 0; i < request.categories().size(); i++) {
            double mean = sums[i] / request.repetitions();
            double deviation = request.repetitions() > 1 ? Math.sqrt((squares[i] - request.repetitions() * mean * mean) / (request.repetitions() - 1)) : 0;
            result.add(new SimulationCategory(request.categories().get(i), request.probabilities().get(i) * 100, round(mean), round(Math.max(0, mean - 1.96 * deviation)), round(Math.min(100, mean + 1.96 * deviation))));
        }
        return new SimulationResult(request.sampleSize(), request.repetitions(), request.seed(), result);
    }

    public record SimulationRequest(List<String> categories, List<Double> probabilities, int sampleSize, int repetitions, long seed) { }
    public record SimulationCategory(String category, double observedPercentage, double simulatedMean, double lower95, double upper95) { }
    public record SimulationResult(int sampleSize, int repetitions, long seed, List<SimulationCategory> categories) { }

    private double round(double value) { return Math.round(value * 100.0) / 100.0; }

    @ExceptionHandler(NoSuchElementException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public Map<String, String> datasetNotFound(NoSuchElementException ex) {
        return Map.of("error", "El dataset solicitado no existe o fue eliminado");
    }

    private List<String> split(String fields) {
        return fields == null || fields.isBlank() ? List.of() : Arrays.stream(fields.split(",")).map(String::trim).filter(s -> !s.isBlank()).toList();
    }
}
