package com.simulacionem.analitica.application.service;

import com.simulacionem.analitica.application.dto.AnalyticsSummaryDto;
import com.simulacionem.analitica.application.dto.CategoryDistributionDto;
import com.simulacionem.analitica.application.dto.CompetenceAverageDto;
import com.simulacionem.analitica.application.dto.CrossTabulationDto;
import com.simulacionem.analitica.application.dto.EmploymentProfileDto;
import com.simulacionem.encuesta.infrastructure.persistence.entity.CompetenceRatingEntity;
import com.simulacionem.encuesta.infrastructure.persistence.entity.DatasetImportEntity;
import com.simulacionem.encuesta.infrastructure.persistence.entity.SurveyResponseEntity;
import com.simulacionem.encuesta.infrastructure.persistence.repository.CompetenceRatingRepository;
import com.simulacionem.encuesta.infrastructure.persistence.repository.DatasetImportRepository;
import com.simulacionem.encuesta.infrastructure.persistence.repository.SurveyResponseRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.Locale;

@Service
public class AnalyticsService {
    public static final int MINIMUM_SAMPLE_SIZE = 5;
    private static final int SEGMENT_REFERENCE_YEAR = 2024;
    private final DatasetImportRepository datasets;
    private final SurveyResponseRepository responses;
    private final CompetenceRatingRepository ratings;

    public AnalyticsService(DatasetImportRepository datasets, SurveyResponseRepository responses,
            CompetenceRatingRepository ratings) {
        this.datasets = datasets;
        this.responses = responses;
        this.ratings = ratings;
    }

    @Transactional(readOnly = true)
    public AnalyticsSummaryDto summary(UUID datasetId, String surveyType, List<String> fields) {
        DatasetImportEntity dataset = resolveDataset(datasetId, surveyType);
        List<SurveyResponseEntity> rows = responses.findByDataset_IdAndResponseStatus(dataset.getId(), "VALIDA");
        if (fields == null || fields.isEmpty())
            fields = defaultFields(dataset.getSurveyType());
        return summarize(dataset, rows, fields);
    }

    @Transactional(readOnly = true)
    public AnalyticsSummaryDto unemploymentSummary(UUID datasetId) {
        DatasetImportEntity dataset = resolveDataset(datasetId, "TITULADOS");
        List<SurveyResponseEntity> rows = responses
                .findByDataset_IdAndResponseStatus(dataset.getId(), "VALIDA")
                .stream()
                .filter(this::isUnemployed)
                .toList();
        return summarize(dataset, rows, List.of(
                "primera_experiencia_laboral", "razon_no_trabaja", "anios_desempleo"));
    }

    @Transactional(readOnly = true)
    public AnalyticsSummaryDto firstEmploymentSummary(UUID datasetId) {
        DatasetImportEntity dataset = resolveDataset(datasetId, "TITULADOS");
        List<SurveyResponseEntity> rows = responses
                .findByDataset_IdAndResponseStatus(dataset.getId(), "VALIDA")
                .stream()
                .filter(this::isFirstEmployment)
                .toList();
        return summarize(dataset, rows, List.of("tiempo_primer_empleo"));
    }

    private AnalyticsSummaryDto summarize(DatasetImportEntity dataset, List<SurveyResponseEntity> rows,
            List<String> fields) {
        Map<String, CategoryDistributionDto> distributions = new LinkedHashMap<>();
        Map<String, Double> averages = new LinkedHashMap<>();
        Map<String, Double> medians = new LinkedHashMap<>();
        Map<String, Double> standardDeviations = new LinkedHashMap<>();
        for (String field : fields) {
            List<String> values = rows.stream().map(r -> value(r, field)).filter(v -> v != null && !v.isBlank())
                    .toList();
            if (numericField(field)) {
                List<Double> numbers = values.stream().map(this::number).filter(java.util.Objects::nonNull).toList();
                if (!numbers.isEmpty()) {
                    averages.put(field, round(numbers.stream().mapToDouble(Double::doubleValue).average().orElse(0)));
                    medians.put(field, median(numbers));
                    standardDeviations.put(field, sampleStandardDeviation(numbers));
                }
            } else {
                distributions.put(field, multiCategoryField(field) ? multiDistribution(values) : distribution(values));
            }
        }
        return new AnalyticsSummaryDto(dataset.getId(), dataset.getSurveyType(), rows.size(), rows.size(),
                distributions, averages, medians, standardDeviations,
                rows.size() < MINIMUM_SAMPLE_SIZE);
    }

    private boolean isUnemployed(SurveyResponseEntity response) {
        String status = value(response, "situacion_laboral_actual");
        if (status == null || status.isBlank()) return false;
        String normalized = java.text.Normalizer.normalize(status.toLowerCase(Locale.ROOT),
                java.text.Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return normalized.contains("no trabaja") || normalized.contains("no trabajo")
                || normalized.contains("busqueda") || normalized.contains("desemple");
    }

    private boolean isFirstEmployment(SurveyResponseEntity response) {
        String value = value(response, "es_primer_empleo");
        if (value == null) value = value(response, "primera_experiencia_laboral");
        if (value == null) return false;
        String normalized = value.toLowerCase(Locale.ROOT).trim();
        return normalized.equals("true") || normalized.equals("si") || normalized.equals("sí");
    }

    @Transactional(readOnly = true)
    public EmploymentProfileDto employmentProfile(UUID datasetId) {
        DatasetImportEntity dataset = resolveDataset(datasetId, "TITULADOS");
        List<SurveyResponseEntity> validRows = responses.findByDataset_IdAndResponseStatus(dataset.getId(), "VALIDA");
        List<EmploymentProfileDto.CohortPointDto> points = validRows
                .stream()
                .map(response -> {
                    Double year = number(value(response, "anio_titulacion"));
                    Double professionalYears = number(value(response, "anios_vida_profesional"));
                    return year == null || professionalYears == null
                            ? null
                            : new EmploymentProfileDto.CohortPointDto(year, professionalYears);
                })
                .filter(java.util.Objects::nonNull)
                .toList();
        return new EmploymentProfileDto(dataset.getId(), validRows.size(), points);
    }

    @Transactional(readOnly = true)
    public List<CompetenceAverageDto> competenceGaps(UUID datasetId) {
        DatasetImportEntity dataset = resolveDataset(datasetId, null);
        Map<String, List<CompetenceRatingEntity>> grouped = ratings.findByResponse_Dataset_Id(dataset.getId()).stream()
                .filter(r -> !r.isNotObserved() && r.getNumericValue() != null)
                .collect(Collectors.groupingBy(r -> r.getCompetence().getCode(), LinkedHashMap::new,
                        Collectors.toList()));
        List<CompetenceAverageDto> result = new ArrayList<>();
        grouped.forEach((code, values) -> {
            var competence = values.get(0).getCompetence();
            double average = values.stream().mapToInt(r -> r.getNumericValue()).average().orElse(0);
            List<Double> numbers = values.stream().map(r -> r.getNumericValue().doubleValue()).toList();
            Map<Integer, Long> levelCounts = values.stream().collect(Collectors
                    .groupingBy(r -> r.getNumericValue().intValue(), java.util.TreeMap::new, Collectors.counting()));
            int modalLevel = levelCounts.entrySet().stream()
                    .max(Map.Entry.<Integer, Long>comparingByValue().thenComparing(Map.Entry.comparingByKey()))
                    .map(Map.Entry::getKey).orElse(0);
            result.add(new CompetenceAverageDto(code, competence.getName(), competence.getCompetenceGroup(),
                    values.size(), round(average),
                    sampleStandardDeviation(numbers), median(numbers), modalLevel, levelCounts));
        });
        return result;
    }

    @Transactional(readOnly = true)
    public CrossTabulationDto cross(UUID datasetId, String rowField, String columnField) {
        DatasetImportEntity dataset = resolveDataset(datasetId, null);
        if (rowField == null || rowField.isBlank() || columnField == null || columnField.isBlank()) {
            throw new IllegalArgumentException("rowField y columnField son obligatorios");
        }
        List<SurveyResponseEntity> valid = responses.findByDataset_IdAndResponseStatus(dataset.getId(), "VALIDA");
        List<SurveyResponseEntity> usable = valid.stream()
                .filter(r -> value(r, rowField) != null && value(r, columnField) != null).toList();
        List<String> rowCategories = usable.stream().map(r -> value(r, rowField)).distinct().sorted().toList();
        List<String> columnCategories = usable.stream().map(r -> value(r, columnField)).distinct().sorted().toList();
        Map<String, Map<String, Long>> counts = new LinkedHashMap<>();
        Map<String, Map<String, Double>> percentages = new LinkedHashMap<>();
        for (String row : rowCategories) {
            Map<String, Long> rowCounts = new LinkedHashMap<>();
            Map<String, Double> rowPercentages = new LinkedHashMap<>();
            long rowTotal = usable.stream().filter(r -> row.equals(value(r, rowField))).count();
            for (String column : columnCategories) {
                long count = usable.stream()
                        .filter(r -> row.equals(value(r, rowField)) && column.equals(value(r, columnField))).count();
                rowCounts.put(column, count);
                rowPercentages.put(column, round(count * 100.0 / rowTotal));
            }
            counts.put(row, rowCounts);
            percentages.put(row, rowPercentages);
        }
        return new CrossTabulationDto(dataset.getId(), rowField, columnField, usable.size(), rowCategories,
                columnCategories, counts, percentages,
                usable.size() < MINIMUM_SAMPLE_SIZE);
    }

    private DatasetImportEntity resolveDataset(UUID id, String type) {
        if (id != null)
            return datasets.findById(id).orElseThrow();
        return datasets.findAll().stream().filter(d -> type == null || type.equals(d.getSurveyType()))
                .reduce((a, b) -> b)
                .orElseThrow(
                        () -> new NoSuchElementException("No existe un dataset importado para el filtro solicitado"));
    }

    private String value(SurveyResponseEntity response, String field) {
        if ("segmento_titulacion".equals(field)) {
            Double graduationYear = number(value(response, "anio_titulacion"));
            if (graduationYear == null) {
                return null;
            }
            return SEGMENT_REFERENCE_YEAR - graduationYear <= 5
                    ? "Junior / Reciente"
                    : "Consolidado";
        }
        Object value = response.getNormalizedPayload().get(field);
        return value == null ? null : String.valueOf(value);
    }

    private CategoryDistributionDto distribution(List<String> values) {
        Map<String, Long> counts = values.stream()
                .collect(Collectors.groupingBy(Function.identity(), LinkedHashMap::new, Collectors.counting()));
        Map<String, Double> percentages = new LinkedHashMap<>();
        counts.forEach((key, count) -> percentages.put(key, round(count * 100.0 / values.size())));
        return new CategoryDistributionDto(values.size(), counts, percentages);
    }

    private CategoryDistributionDto multiDistribution(List<String> values) {
        List<String> options = values.stream()
                .flatMap(value -> java.util.Arrays.stream(value.split("\\s*[,;\\n]\\s*")))
                .map(String::trim).filter(value -> !value.isBlank()).toList();
        Map<String, Long> counts = options.stream()
                .collect(Collectors.groupingBy(Function.identity(), LinkedHashMap::new, Collectors.counting()));
        Map<String, Double> percentages = new LinkedHashMap<>();
        counts.forEach((key, count) -> percentages.put(key, round(count * 100.0 / values.size())));
        return new CategoryDistributionDto(values.size(), counts, percentages);
    }

    private boolean multiCategoryField(String field) {
        return List.of("aspectos_utiles", "aspectos_mejorables", "asignaturas_ventaja", "asignaturas_poco_utiles",
                "area_posgrado_interes", "area_trabajo", "redes_sociales_activas", "cargos_titulados")
                .contains(field);
    }

    private List<String> defaultFields(String type) {
        return "EMPLEADORES".equals(type)
                ? List.of("tipo_organizacion", "tamano_organizacion", "rubro_organizacion",
                        "contrato_titulados_ultimos_5_anios", "presencia_sedes", "posibilidad_incorporacion",
                        "nivel_formacion_demandado", "medio_convocatoria", "cargos_titulados")
                : List.of("edad_rango", "sector_trabajo", "situacion_laboral_actual", "tiene_formacion_complementaria",
                        "interes_posgrado");
    }

    private boolean numericField(String field) {
        return field.equals("anio_titulacion") || field.equals("anios_vida_profesional")
                || field.equals("anios_desempleo") || field.endsWith("_puntaje");
    }

    private Double number(String value) {
        if (value == null || value.isBlank())
            return null;
        try {
            return Double.valueOf(value.trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private Double sampleStandardDeviation(List<Double> values) {
        if (values.size() < 2)
            return null;
        double average = values.stream().mapToDouble(Double::doubleValue).average().orElse(0);
        double variance = values.stream().mapToDouble(value -> Math.pow(value - average, 2)).sum()
                / (values.size() - 1);
        return round(Math.sqrt(variance));
    }

    private Double median(List<Double> values) {
        List<Double> sorted = values.stream().sorted().toList();
        int middle = sorted.size() / 2;
        double result = sorted.size() % 2 == 0 ? (sorted.get(middle - 1) + sorted.get(middle)) / 2 : sorted.get(middle);
        return round(result);
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
