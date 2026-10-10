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
import java.time.Year;
import java.text.Normalizer;

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
        return summary(datasetId, surveyType, fields, new TituladosFilter(null, null, List.of(), List.of()));
    }

    @Transactional(readOnly = true)
    public AnalyticsSummaryDto summary(UUID datasetId, String surveyType, List<String> fields, TituladosFilter filter) {
        DatasetImportEntity dataset = resolveDataset(datasetId, surveyType);
        List<SurveyResponseEntity> allRows = responses.findByDataset_IdAndResponseStatus(dataset.getId(), "VALIDA");
        List<SurveyResponseEntity> rows = applyFilter(allRows, filter);
        if (fields == null || fields.isEmpty())
            fields = defaultFields(dataset.getSurveyType());
        return summarize(dataset, rows, fields, allRows.size(), yearBounds(allRows));
    }

    @Transactional(readOnly = true)
    public AnalyticsSummaryDto unemploymentSummary(UUID datasetId) {
        return unemploymentSummary(datasetId, new TituladosFilter(null, null, List.of(), List.of()));
    }
    public AnalyticsSummaryDto unemploymentSummary(UUID datasetId, TituladosFilter filter) {
        DatasetImportEntity dataset = resolveDataset(datasetId, "TITULADOS");
        List<SurveyResponseEntity> allRows = responses.findByDataset_IdAndResponseStatus(dataset.getId(), "VALIDA");
        List<SurveyResponseEntity> rows = applyFilter(allRows, filter)
                .stream()
                .filter(this::isUnemployed)
                .toList();
        return summarize(dataset, rows, List.of(
                "primera_experiencia_laboral", "razon_no_trabaja", "anios_desempleo"));
    }

    @Transactional(readOnly = true)
    public AnalyticsSummaryDto firstEmploymentSummary(UUID datasetId) {
        return firstEmploymentSummary(datasetId, new TituladosFilter(null, null, List.of(), List.of()));
    }
    public AnalyticsSummaryDto firstEmploymentSummary(UUID datasetId, TituladosFilter filter) {
        DatasetImportEntity dataset = resolveDataset(datasetId, "TITULADOS");
        List<SurveyResponseEntity> allRows = responses.findByDataset_IdAndResponseStatus(dataset.getId(), "VALIDA");
        List<SurveyResponseEntity> rows = applyFilter(allRows, filter)
                .stream()
                .filter(this::isFirstEmployment)
                .toList();
        return summarize(dataset, rows, List.of("tiempo_primer_empleo"));
    }

    @Transactional(readOnly = true)
    public AnalyticsSummaryDto entrepreneurshipSummary(UUID datasetId) {
        return entrepreneurshipSummary(datasetId, new TituladosFilter(null, null, List.of(), List.of()));
    }
    public AnalyticsSummaryDto entrepreneurshipSummary(UUID datasetId, TituladosFilter filter) {
        DatasetImportEntity dataset = resolveDataset(datasetId, "TITULADOS");
        List<SurveyResponseEntity> allRows = responses.findByDataset_IdAndResponseStatus(dataset.getId(), "VALIDA");
        List<SurveyResponseEntity> rows = applyFilter(allRows, filter)
                .stream()
                .filter(this::isEntrepreneur)
                .toList();
        return summarize(dataset, rows, List.of(
                "origen_emprendimiento", "entregable_emprendimiento",
                "financiamiento_emprendimiento", "satisfaccion_emprendimiento",
                "importancia_formacion_emprendimiento"));
    }

    private AnalyticsSummaryDto summarize(DatasetImportEntity dataset, List<SurveyResponseEntity> rows,
            List<String> fields) {
        return summarize(dataset, rows, fields, rows.size(), yearBounds(rows));
    }
    private AnalyticsSummaryDto summarize(DatasetImportEntity dataset, List<SurveyResponseEntity> rows,
            List<String> fields, long totalResponses, Integer[] yearBounds) {
        Map<String, CategoryDistributionDto> distributions = new LinkedHashMap<>();
        Map<String, Double> averages = new LinkedHashMap<>();
        Map<String, Double> medians = new LinkedHashMap<>();
        Map<String, Double> standardDeviations = new LinkedHashMap<>();
        for (String field : fields) {
            List<String> values = rows.stream().map(r -> value(r, field)).filter(this::isAnalyticValue)
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
        return new AnalyticsSummaryDto(dataset.getId(), dataset.getSurveyType(), totalResponses, rows.size(),
                distributions, averages, medians, standardDeviations,
                rows.size() < MINIMUM_SAMPLE_SIZE, yearBounds[0], yearBounds[1]);
    }

    private List<SurveyResponseEntity> applyFilter(List<SurveyResponseEntity> rows, TituladosFilter filter) {
        if (filter == null || !filter.active()) return rows;
        return rows.stream().filter(row -> matchesFilter(row, filter)).toList();
    }

    private boolean matchesFilter(SurveyResponseEntity row, TituladosFilter filter) {
        Integer year = validYear(value(row, "anio_titulacion"));
        if (filter.yearFrom() != null && (year == null || year < filter.yearFrom())) return false;
        if (filter.yearTo() != null && (year == null || year > filter.yearTo())) return false;
        if (!filter.laborStatuses().isEmpty()
                && !filter.laborStatuses().stream().anyMatch(status -> laborCategory(row).equals(normalize(status)))) return false;
        if (!filter.sectors().isEmpty()
                && !filter.sectors().stream().anyMatch(sector -> sectorMatches(value(row, "sector_trabajo"), sector))) return false;
        return true;
    }

    private String laborCategory(SurveyResponseEntity row) {
        String status = normalize(value(row, "situacion_laboral_actual"));
        if (status.isBlank()) return normalize("Sin respuesta");
        if (status.contains("emprend")) return normalize("Emprendimiento propio");
        if (status.contains("no trabaja") || status.contains("no trabajo") || status.contains("busqueda")
                || status.contains("desemple")) return normalize("Actualmente no trabaja");
        if (status.contains("trabaja en") || status.contains("organizacion"))
            return normalize("Trabaja en una organización");
        return status;
    }

    private boolean sectorMatches(String value, String selected) {
        String actual = normalize(value);
        String expected = normalize(selected);
        if (actual.isBlank()) return false;
        if (expected.equals("no trabaja")) return actual.contains("no trabaja") || actual.contains("no trabajo");
        return actual.equals(expected) || actual.contains(expected);
    }

    private String normalize(String value) {
        if (value == null) return "";
        return Normalizer.normalize(value, Normalizer.Form.NFD).replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT).replaceAll("\\s+", " ").trim();
    }

    private boolean isAnalyticValue(String value) {
        String normalized = normalize(value);
        return !normalized.isBlank()
                && !normalized.equals("no sabe")
                && !normalized.equals("no observado")
                && !normalized.equals("no observada");
    }

    private Integer validYear(String raw) {
        if (raw == null) return null;
        String text = raw.trim();
        Integer year = null;
        if (text.matches("\\d{4}")) {
            year = Integer.parseInt(text);
        } else if (text.matches("\\d{4}\\.0+")) {
            year = Integer.parseInt(text.substring(0, 4));
        }
        return year != null && year >= 1990 && year <= Year.now().getValue() ? year : null;
    }

    private Integer[] yearBounds(List<SurveyResponseEntity> rows) {
        List<Integer> years = rows.stream().map(row -> validYear(value(row, "anio_titulacion")))
                .filter(java.util.Objects::nonNull).sorted().toList();
        return years.isEmpty() ? new Integer[] { null, null } : new Integer[] { years.get(0), years.get(years.size() - 1) };
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

    private boolean isEntrepreneur(SurveyResponseEntity response) {
        String status = value(response, "situacion_laboral_actual");
        return status != null && status.toLowerCase(Locale.ROOT).contains("emprend");
    }

    @Transactional(readOnly = true)
    public EmploymentProfileDto employmentProfile(UUID datasetId) {
        return employmentProfile(datasetId, new TituladosFilter(null, null, List.of(), List.of()));
    }
    public EmploymentProfileDto employmentProfile(UUID datasetId, TituladosFilter filter) {
        DatasetImportEntity dataset = resolveDataset(datasetId, "TITULADOS");
        List<SurveyResponseEntity> validRows = applyFilter(
                responses.findByDataset_IdAndResponseStatus(dataset.getId(), "VALIDA"), filter);
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
        return competenceGaps(datasetId, new TituladosFilter(null, null, List.of(), List.of()));
    }
    @Transactional(readOnly = true)
    public List<CompetenceAverageDto> competenceGaps(UUID datasetId, TituladosFilter filter) {
        DatasetImportEntity dataset = resolveDataset(datasetId, null);
        Map<String, List<CompetenceRatingEntity>> grouped = ratings.findByResponse_Dataset_Id(dataset.getId()).stream()
                .filter(r -> !r.isNotObserved() && r.getNumericValue() != null)
                .filter(r -> !"TITULADOS".equals(dataset.getSurveyType()) || matchesFilter(r.getResponse(), filter))
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
        return cross(datasetId, rowField, columnField, new TituladosFilter(null, null, List.of(), List.of()));
    }

    public CrossTabulationDto cross(UUID datasetId, String rowField, String columnField, TituladosFilter filter) {
        DatasetImportEntity dataset = resolveDataset(datasetId, null);
        if (rowField == null || rowField.isBlank() || columnField == null || columnField.isBlank()) {
            throw new IllegalArgumentException("rowField y columnField son obligatorios");
        }
        List<SurveyResponseEntity> valid = responses.findByDataset_IdAndResponseStatus(dataset.getId(), "VALIDA");
        if ("TITULADOS".equals(dataset.getSurveyType())) valid = applyFilter(valid, filter);
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
                .flatMap(value -> splitMultiValue(value).stream())
                .map(String::trim).filter(value -> !value.isBlank()).toList();
        Map<String, Long> counts = options.stream()
                .collect(Collectors.groupingBy(Function.identity(), LinkedHashMap::new, Collectors.counting()));
        Map<String, Double> percentages = new LinkedHashMap<>();
        counts.forEach((key, count) -> percentages.put(key, round(count * 100.0 / values.size())));
        return new CategoryDistributionDto(values.size(), counts, percentages);
    }

    private List<String> splitMultiValue(String value) {
        List<String> options = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        int parenthesesDepth = 0;
        for (int index = 0; index < value.length(); index++) {
            char character = value.charAt(index);
            if (character == '(') parenthesesDepth++;
            if (character == ')' && parenthesesDepth > 0) parenthesesDepth--;

            boolean explicitSeparator = character == ';' || character == '\n' || character == '\r';
            int next = index + 1;
            while (next < value.length() && Character.isWhitespace(value.charAt(next))) next++;
            boolean commaSeparator = character == ',' && parenthesesDepth == 0 && next < value.length()
                    && (Character.isUpperCase(value.charAt(next)) || Character.isDigit(value.charAt(next))
                            || value.charAt(next) == '¿');
            if (explicitSeparator || commaSeparator) {
                addMultiOption(options, current);
                current.setLength(0);
            } else {
                current.append(character);
            }
        }
        addMultiOption(options, current);
        return options;
    }

    private void addMultiOption(List<String> options, StringBuilder value) {
        String option = value.toString().trim();
        if (!option.isBlank()) options.add(option);
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
