package com.simulacionem.analitica.presentation.rest;

import com.simulacionem.analitica.application.dto.AnalyticsSummaryDto;
import com.simulacionem.analitica.application.dto.CompetenceAverageDto;
import com.simulacionem.analitica.application.dto.CrossTabulationDto;
import com.simulacionem.analitica.application.dto.EmploymentProfileDto;
import com.simulacionem.analitica.application.service.AnalyticsService;
import com.simulacionem.analitica.application.service.TituladosFilter;
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
import java.util.Collections;
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
                                                @RequestParam(required = false) String fields,
                                                @RequestParam(required = false) Integer yearFrom,
                                                @RequestParam(required = false) Integer yearTo,
                                                @RequestParam(required = false) List<String> laborStatus,
                                                @RequestParam(required = false) List<String> sector,
                                                @RequestParam(required = false) List<String> gender) {
        return analytics.summary(datasetId, "TITULADOS", split(fields), filter(yearFrom, yearTo, laborStatus, sector, gender));
    }

    @GetMapping("/titulados/employment")
    public AnalyticsSummaryDto tituladosEmployment(@RequestParam(required = false) UUID datasetId,
                                                   @RequestParam(required = false) Integer yearFrom,
                                                   @RequestParam(required = false) Integer yearTo,
                                                   @RequestParam(required = false) List<String> laborStatus,
                                                   @RequestParam(required = false) List<String> sector) {
        return analytics.summary(datasetId, "TITULADOS", List.of(
                "anio_titulacion", "anios_vida_profesional", "anios_desempleo",
                "situacion_laboral_actual", "sector_trabajo", "sector_trabajo_actual", "es_primer_empleo", "primera_experiencia_laboral",
                "razon_no_trabaja", "experiencia_laboral_previa", "tiempo_primer_empleo", "cantidad_empleos",
                "edad_rango", "genero", "rubro_trabajo_actual", "remuneracion_rango",
                "area_trabajo", "pertinencia_trabajo_formacion"), filter(yearFrom, yearTo, laborStatus, sector));
    }

    @GetMapping("/titulados/employment/unemployment")
    public AnalyticsSummaryDto tituladosUnemployment(@RequestParam(required = false) UUID datasetId,
                                                     @RequestParam(required = false) Integer yearFrom,
                                                     @RequestParam(required = false) Integer yearTo,
                                                     @RequestParam(required = false) List<String> laborStatus,
                                                     @RequestParam(required = false) List<String> sector) {
        return analytics.unemploymentSummary(datasetId, filter(yearFrom, yearTo, laborStatus, sector));
    }

    @GetMapping("/titulados/employment/first-employment")
    public AnalyticsSummaryDto tituladosFirstEmployment(@RequestParam(required = false) UUID datasetId,
                                                        @RequestParam(required = false) Integer yearFrom,
                                                        @RequestParam(required = false) Integer yearTo,
                                                        @RequestParam(required = false) List<String> laborStatus,
                                                        @RequestParam(required = false) List<String> sector) {
        return analytics.firstEmploymentSummary(datasetId, filter(yearFrom, yearTo, laborStatus, sector));
    }

    @GetMapping("/titulados/employment/entrepreneurship")
    public AnalyticsSummaryDto tituladosEntrepreneurship(@RequestParam(required = false) UUID datasetId,
                                                         @RequestParam(required = false) Integer yearFrom,
                                                         @RequestParam(required = false) Integer yearTo,
                                                         @RequestParam(required = false) List<String> laborStatus,
                                                         @RequestParam(required = false) List<String> sector) {
        return analytics.entrepreneurshipSummary(datasetId, filter(yearFrom, yearTo, laborStatus, sector));
    }

    @GetMapping("/titulados/employment/profile")
    public EmploymentProfileDto tituladosEmploymentProfile(@RequestParam(required = false) UUID datasetId,
                                                           @RequestParam(required = false) Integer yearFrom,
                                                           @RequestParam(required = false) Integer yearTo,
                                                           @RequestParam(required = false) List<String> laborStatus,
                                                           @RequestParam(required = false) List<String> sector) {
        return analytics.employmentProfile(datasetId, filter(yearFrom, yearTo, laborStatus, sector));
    }

    @GetMapping("/titulados/education")
    public AnalyticsSummaryDto tituladosEducation(@RequestParam(required = false) UUID datasetId,
                                                  @RequestParam(required = false) Integer yearFrom,
                                                  @RequestParam(required = false) Integer yearTo,
                                                  @RequestParam(required = false) List<String> laborStatus,
                                                  @RequestParam(required = false) List<String> sector) {
        return analytics.summary(datasetId, "TITULADOS", List.of(
                "tiene_formacion_complementaria", "formacion_complementaria_nivel",
                "institucion_formacion_complementaria", "financiamiento_posgrado_cursado",
                "interes_posgrado", "nivel_posgrado_interes", "area_posgrado_interes",
                "modalidad_posgrado", "institucion_posgrado_interes", "financiamiento_posgrado_estimado",
                "valoracion_formacion_1"), filter(yearFrom, yearTo, laborStatus, sector));
    }

    @GetMapping("/titulados/satisfaction")
    public AnalyticsSummaryDto tituladosSatisfaction(@RequestParam(required = false) UUID datasetId,
                                                     @RequestParam(required = false) Integer yearFrom,
                                                     @RequestParam(required = false) Integer yearTo,
                                                     @RequestParam(required = false) List<String> laborStatus,
                                                     @RequestParam(required = false) List<String> sector) {
        return analytics.summary(datasetId, "TITULADOS", List.of(
                "satisfaccion_formacion", "concordancia_formacion_requerimientos",
                "pertinencia_trabajo_formacion", "satisfaccion_emprendimiento",
                "importancia_formacion_emprendimiento"), filter(yearFrom, yearTo, laborStatus, sector));
    }

    @GetMapping("/titulados/curriculum")
    public AnalyticsSummaryDto tituladosCurriculum(@RequestParam(required = false) UUID datasetId,
                                                   @RequestParam(required = false) Integer yearFrom,
                                                   @RequestParam(required = false) Integer yearTo,
                                                   @RequestParam(required = false) List<String> laborStatus,
                                                   @RequestParam(required = false) List<String> sector) {
        return analytics.summary(datasetId, "TITULADOS", List.of(
                "aspectos_utiles", "aspectos_mejorables", "asignaturas_ventaja", "asignaturas_poco_utiles"), filter(yearFrom, yearTo, laborStatus, sector));
    }

    @GetMapping("/titulados/financing")
    public AnalyticsSummaryDto tituladosFinancing(@RequestParam(required = false) UUID datasetId,
                                                  @RequestParam(required = false) Integer yearFrom,
                                                  @RequestParam(required = false) Integer yearTo,
                                                  @RequestParam(required = false) List<String> laborStatus,
                                                  @RequestParam(required = false) List<String> sector) {
        return analytics.summary(datasetId, "TITULADOS", List.of(
                "financiamiento_posgrado_estimado", "nivel_posgrado_interes"), filter(yearFrom, yearTo, laborStatus, sector));
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
                                                     @RequestParam(required = false) Integer yearFrom,
                                                     @RequestParam(required = false) Integer yearTo,
                                                     @RequestParam(required = false) List<String> laborStatus,
                                                     @RequestParam(required = false) List<String> sector,
                                                     @RequestParam(required = false) List<String> organizationType,
                                                     @RequestParam(required = false) List<String> organizationSize) {
        return analytics.competenceGaps(datasetId,
                filter(yearFrom, yearTo, laborStatus, sector, organizationType, organizationSize));
    }

    @GetMapping("/crosses")
    public CrossTabulationDto crosses(@RequestParam UUID datasetId,
                                      @RequestParam String rowField,
                                      @RequestParam String columnField,
                                      @RequestParam(required = false) Integer yearFrom,
                                      @RequestParam(required = false) Integer yearTo,
                                      @RequestParam(required = false) List<String> laborStatus,
                                      @RequestParam(required = false) List<String> sector,
                                      @RequestParam(required = false) List<String> organizationType,
                                      @RequestParam(required = false) List<String> organizationSize) {
        return analytics.cross(datasetId, rowField, columnField,
                filter(yearFrom, yearTo, laborStatus, sector, organizationType, organizationSize));
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
        List<List<Double>> replicaPercentages = new ArrayList<>();
        List<SimulationDraw> firstDraws = new ArrayList<>();
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
                if (repetition == 0 && firstDraws.size() < 10) firstDraws.add(new SimulationDraw(round(value), request.categories().get(category)));
            }
            for (int i = 0; i < counts.length; i++) {
                if (replicaPercentages.size() <= i) replicaPercentages.add(new ArrayList<>());
                replicaPercentages.get(i).add(round(counts[i] * 100.0 / request.sampleSize()));
            }
            for (int i = 0; i < counts.length; i++) { sums[i] += counts[i] * 100.0 / request.sampleSize(); squares[i] += Math.pow(counts[i] * 100.0 / request.sampleSize(), 2); }
        }
        List<SimulationCategory> result = new ArrayList<>();
        long observedTotal = request.observedCounts() == null ? 0L
                : request.observedCounts().stream().mapToLong(Long::longValue).sum();
        for (int i = 0; i < request.categories().size(); i++) {
            double mean = sums[i] / request.repetitions();
            double deviation = request.repetitions() > 1 ? Math.sqrt((squares[i] - request.repetitions() * mean * mean) / (request.repetitions() - 1)) : 0;
            List<Double> replicas = replicaPercentages.get(i);
            double q1 = percentile(replicas, 0.25);
            double median = percentile(replicas, 0.50);
            double q3 = percentile(replicas, 0.75);
            long observedCount = request.observedCounts() != null && i < request.observedCounts().size()
                    ? request.observedCounts().get(i) : 0L;
            double observedPercentage = observedTotal > 0
                    ? observedCount * 100.0 / observedTotal
                    : request.probabilities().get(i) * 100;
            result.add(new SimulationCategory(request.categories().get(i), observedCount,
                    round(observedPercentage), round(mean),
                    round(Math.max(0, mean - 1.96 * deviation)),
                    round(Math.min(100, mean + 1.96 * deviation)), round(deviation), replicas,
                    round(q1), round(median), round(q3)));
        }
        List<Double> cumulativeRounded = new ArrayList<>();
        for (double value : cumulative) cumulativeRounded.add(round(value));
        return new SimulationResult(request.sampleSize(), request.repetitions(), request.seed(), result, cumulativeRounded, firstDraws);
    }

    public record SimulationRequest(List<String> categories, List<Double> probabilities, List<Long> observedCounts,
                                    int sampleSize, int repetitions, long seed) { }
    public record SimulationCategory(String category, long observedCount, double observedPercentage,
                                     double simulatedMean, double lower95, double upper95,
                                     double standardDeviation, List<Double> replicaPercentages,
                                     double firstQuartile, double median, double thirdQuartile) { }
    public record SimulationDraw(double random, String category) { }
    public record SimulationResult(int sampleSize, int repetitions, long seed, List<SimulationCategory> categories,
                                   List<Double> cumulativeProbabilities, List<SimulationDraw> firstDraws) { }

    private double round(double value) { return Math.round(value * 100.0) / 100.0; }

    private double percentile(List<Double> values, double probability) {
        if (values.isEmpty()) return 0;
        List<Double> sorted = values.stream().sorted().toList();
        double position = probability * (sorted.size() - 1);
        int lower = (int) Math.floor(position);
        int upper = (int) Math.ceil(position);
        if (lower == upper) return sorted.get(lower);
        double fraction = position - lower;
        return sorted.get(lower) + fraction * (sorted.get(upper) - sorted.get(lower));
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

    private TituladosFilter filter(Integer yearFrom, Integer yearTo, List<String> laborStatus, List<String> sector) {
        return filter(yearFrom, yearTo, laborStatus, sector, null, null, null);
    }

    private TituladosFilter filter(Integer yearFrom, Integer yearTo, List<String> laborStatus, List<String> sector, List<String> gender) {
        return new TituladosFilter(yearFrom, yearTo,
                laborStatus == null ? Collections.emptyList() : laborStatus,
                sector == null ? Collections.emptyList() : sector,
                gender == null ? Collections.emptyList() : gender,
                Collections.emptyList(), Collections.emptyList());
    }

    private TituladosFilter filter(Integer yearFrom, Integer yearTo, List<String> laborStatus, List<String> sector,
                                   List<String> organizationType, List<String> organizationSize) {
        return new TituladosFilter(yearFrom, yearTo,
                laborStatus == null ? Collections.emptyList() : laborStatus,
                sector == null ? Collections.emptyList() : sector,
                Collections.emptyList(),
                organizationType == null ? Collections.emptyList() : organizationType,
                organizationSize == null ? Collections.emptyList() : organizationSize);
    }
}
