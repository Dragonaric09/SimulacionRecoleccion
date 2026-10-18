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
import org.springframework.beans.factory.annotation.Autowired;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Objects;
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
    /** Variables de empleadores que admiten cruces: todas de opción única o escala. */
    static final List<String> EMPLOYER_CROSS_FIELDS = List.of("tipo_organizacion", "tamano_organizacion",
            "rubro_organizacion", "departamento_organizacion", "presencia_sedes", "contrato_titulados_ultimos_5_anios",
            "posibilidad_incorporacion", "nivel_formacion_demandado", "medio_convocatoria");
    /** Mismas opciones que el formulario de empleadores (orden 23). */
    private static final List<String> CARGO_OPTIONS = List.of(
            "De apoyo / asistencia tecnológica",
            "Técnico (desarrollo de software, administración de sistemas, redes, bases de datos, soporte TI)",
            "Analista (sistemas, datos, procesos o soluciones tecnológicas)",
            "Especialista (ciberseguridad, arquitectura de software, infraestructura tecnológica, entre otros)",
            "Supervisor / Coordinador de área tecnológica",
            "Jefatura o Gerencial (gestión de proyectos, dirección de TI, transformación digital)",
            "Consultor tecnológico");
    private final DatasetImportRepository datasets;
    private final SurveyResponseRepository responses;
    private final CompetenceRatingRepository ratings;
    private final TituladosSql tituladosSql;

    /**
     * Las pantallas de analítica consultan varios indicadores del mismo dataset en paralelo.
     * Las respuestas válidas son inmutables durante la vida del dataset, por lo que se pueden
     * reutilizar entre endpoints y evitar volver a deserializar el mismo JSON varias veces.
     * Se limita a los últimos ocho datasets para no convertir la optimización en una caché ilimitada.
     */
    private final Map<UUID, List<SurveyResponseEntity>> validRowsCache = Collections.synchronizedMap(
            new LinkedHashMap<>(16, 0.75f, true) {
                @Override
                protected boolean removeEldestEntry(Map.Entry<UUID, List<SurveyResponseEntity>> eldest) {
                    return size() > 8;
                }
            });

    public AnalyticsService(DatasetImportRepository datasets, SurveyResponseRepository responses,
            CompetenceRatingRepository ratings) {
        this(datasets, responses, ratings, null);
    }

    @Autowired
    public AnalyticsService(DatasetImportRepository datasets, SurveyResponseRepository responses,
            CompetenceRatingRepository ratings, TituladosSql tituladosSql) {
        this.datasets = datasets;
        this.responses = responses;
        this.ratings = ratings;
        this.tituladosSql = tituladosSql;
    }

    @Transactional(readOnly = true)
    public AnalyticsSummaryDto summary(UUID datasetId, String surveyType, List<String> fields) {
        return summary(datasetId, surveyType, fields, new TituladosFilter(null, null, List.of(), List.of()));
    }

    @Transactional(readOnly = true)
    public AnalyticsSummaryDto summary(UUID datasetId, String surveyType, List<String> fields, TituladosFilter filter) {
        DatasetImportEntity dataset = resolveDataset(datasetId, surveyType);
        List<SurveyResponseEntity> allRows = validRows(dataset.getId());
        List<SurveyResponseEntity> rows = filteredRows(dataset.getId(), allRows, filter);
        if (fields == null || fields.isEmpty())
            fields = defaultFields(dataset.getSurveyType());
        return summarize(dataset, rows, fields, allRows.size(), yearBounds(allRows), true);
    }

    @Transactional(readOnly = true)
    public AnalyticsSummaryDto unemploymentSummary(UUID datasetId) {
        return unemploymentSummary(datasetId, new TituladosFilter(null, null, List.of(), List.of()));
    }
    public AnalyticsSummaryDto unemploymentSummary(UUID datasetId, TituladosFilter filter) {
        DatasetImportEntity dataset = resolveDataset(datasetId, "TITULADOS");
        List<SurveyResponseEntity> allRows = validRows(dataset.getId());
        List<SurveyResponseEntity> rows = filteredRows(dataset.getId(), allRows, filter)
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
        List<SurveyResponseEntity> allRows = validRows(dataset.getId());
        List<SurveyResponseEntity> rows = filteredRows(dataset.getId(), allRows, filter).stream()
                .filter(this::isFirstEmploymentBranch)
                .toList();
        return summarize(dataset, rows, List.of("tiempo_primer_empleo"));
    }

    @Transactional(readOnly = true)
    public AnalyticsSummaryDto entrepreneurshipSummary(UUID datasetId) {
        return entrepreneurshipSummary(datasetId, new TituladosFilter(null, null, List.of(), List.of()));
    }
    public AnalyticsSummaryDto entrepreneurshipSummary(UUID datasetId, TituladosFilter filter) {
        DatasetImportEntity dataset = resolveDataset(datasetId, "TITULADOS");
        List<SurveyResponseEntity> allRows = validRows(dataset.getId());
        List<SurveyResponseEntity> rows = filteredRows(dataset.getId(), allRows, filter)
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
        return summarize(dataset, rows, fields, rows.size(), yearBounds(rows), false);
    }
    private AnalyticsSummaryDto summarize(DatasetImportEntity dataset, List<SurveyResponseEntity> rows,
            List<String> fields, long totalResponses, Integer[] yearBounds, boolean allowSql) {
        Map<String, CategoryDistributionDto> distributions = new LinkedHashMap<>();
        Map<String, Double> averages = new LinkedHashMap<>();
        Map<String, Double> medians = new LinkedHashMap<>();
        Map<String, Double> standardDeviations = new LinkedHashMap<>();
        for (String field : fields) {
            if (allowSql && "TITULADOS".equals(dataset.getSurveyType())
                    && tituladosSql != null && sqlSummaryField(field)) {
                List<UUID> responseIds = rows.size() == totalResponses ? null
                        : rows.stream().map(SurveyResponseEntity::getId).toList();
                TituladosSql.FieldSummary aggregate = tituladosSql.summaryField(dataset.getId(), field,
                        numericField(field), responseIds);
                if (aggregate.numeric()) {
                    if (aggregate.validCount() > 0) {
                        averages.put(field, round(aggregate.average()));
                        medians.put(field, round(aggregate.median()));
                        standardDeviations.put(field, aggregate.deviation() == null ? null : round(aggregate.deviation()));
                    }
                } else if (aggregate.validCount() > 0) {
                    Map<String, Double> percentages = new LinkedHashMap<>();
                    aggregate.counts().forEach((key, count) -> percentages.put(key, round(count * 100.0 / aggregate.validCount())));
                    distributions.put(field, new CategoryDistributionDto(aggregate.validCount(), aggregate.counts(), percentages));
                }
                continue;
            }
            boolean keepNonAnswers = "EMPLEADORES".equals(dataset.getSurveyType()) && field.startsWith("valoracion_");
            List<String> values = rowsForField(rows, field).stream().map(r -> value(r, field))
                    .filter(v -> keepNonAnswers ? v != null && !v.isBlank() : isAnalyticValue(v)).toList();
            if (numericField(field)) {
                List<Double> numbers = values.stream().map(this::number).filter(java.util.Objects::nonNull).toList();
                if (!numbers.isEmpty()) {
                    averages.put(field, round(numbers.stream().mapToDouble(Double::doubleValue).average().orElse(0)));
                    medians.put(field, median(numbers));
                    standardDeviations.put(field, sampleStandardDeviation(numbers));
                }
            } else {
                distributions.put(field, multiCategoryField(field) ? multiDistribution(field, values) : distribution(values));
            }
        }
        return new AnalyticsSummaryDto(dataset.getId(), dataset.getSurveyType(), totalResponses, rows.size(),
                distributions, averages, medians, standardDeviations,
                rows.size() < MINIMUM_SAMPLE_SIZE, yearBounds[0], yearBounds[1]);
    }

    private boolean sqlSummaryField(String field) {
        if (multiCategoryField(field) || organizationWorkField(field)) return false;
        if (field.equals("edad_rango") || field.equals("sector_trabajo") || field.equals("es_primer_empleo")) return false;
        if (List.of("formacion_complementaria_nivel", "institucion_formacion_complementaria",
                "financiamiento_posgrado_cursado", "nivel_posgrado_interes", "area_posgrado_interes",
                "modalidad_posgrado", "institucion_posgrado_interes", "financiamiento_posgrado_estimado").contains(field)) return false;
        return true;
    }

    private List<SurveyResponseEntity> rowsForField(List<SurveyResponseEntity> rows, String field) {
        if (organizationWorkField(field)) {
            return rows.stream().filter(this::worksInOrganization).toList();
        }
        if (field.equals("es_primer_empleo")) {
            return rows.stream().filter(this::isOccupied).toList();
        }
        if (List.of("formacion_complementaria_nivel", "institucion_formacion_complementaria",
                "financiamiento_posgrado_cursado").contains(field)) {
            return rows.stream()
                    .filter(row -> affirmative(value(row, "tiene_formacion_complementaria")))
                    .toList();
        }
        if (List.of("nivel_posgrado_interes", "area_posgrado_interes", "modalidad_posgrado",
                "institucion_posgrado_interes", "financiamiento_posgrado_estimado").contains(field)) {
            return rows.stream()
                    .filter(row -> affirmative(value(row, "interes_posgrado")))
                    .toList();
        }
        return rows;
    }

    private boolean organizationWorkField(String field) {
        return List.of("sector_trabajo", "sector_trabajo_actual", "rubro_trabajo_actual", "remuneracion_rango",
                "area_trabajo", "cargo_actual", "pertinencia_trabajo_formacion",
                "departamento_trabajo", "medio_obtencion_empleo", "antiguedad_trabajo")
                .contains(field);
    }

    private boolean worksInOrganization(SurveyResponseEntity response) {
        String status = normalize(value(response, "situacion_laboral_actual"));
        return status.contains("organizacion") || status.contains("empresa");
    }

    private boolean isOccupied(SurveyResponseEntity response) {
        return worksInOrganization(response) || isEntrepreneur(response);
    }

    private boolean crossFieldBranchAllows(SurveyResponseEntity response, String field) {
        if (organizationWorkField(field)) return worksInOrganization(response);
        if (List.of("nivel_posgrado_interes", "area_posgrado_interes", "modalidad_posgrado",
                "institucion_posgrado_interes", "financiamiento_posgrado_estimado").contains(field)) {
            return affirmative(value(response, "interes_posgrado"));
        }
        return true;
    }

    private boolean affirmative(String raw) {
        if (raw == null) return false;
        String normalized = normalize(raw);
        return normalized.equals("si") || normalized.equals("true") || normalized.equals("1");
    }

    private List<SurveyResponseEntity> applyFilter(List<SurveyResponseEntity> rows, TituladosFilter filter) {
        if (filter == null || !filter.active()) return rows;
        return rows.stream().filter(row -> matchesFilter(row, filter)).toList();
    }

    private boolean matchesFilter(SurveyResponseEntity row, TituladosFilter filter) {
        if (!filter.organizationTypes().isEmpty()
                && filter.organizationTypes().stream().noneMatch(type -> normalize(value(row, "tipo_organizacion")).equals(normalize(type)))) return false;
        if (!filter.organizationSizes().isEmpty()
                && filter.organizationSizes().stream().noneMatch(size -> normalize(value(row, "tamano_organizacion")).equals(normalize(size)))) return false;
        Integer year = validYear(value(row, "anio_titulacion"));
        if (filter.yearFrom() != null && (year == null || year < filter.yearFrom())) return false;
        if (filter.yearTo() != null && (year == null || year > filter.yearTo())) return false;
        if (!filter.laborStatuses().isEmpty()
                && !filter.laborStatuses().stream().anyMatch(status -> laborCategory(row).equals(normalize(status)))) return false;
        if (!filter.sectors().isEmpty()
                && !filter.sectors().stream().anyMatch(sector -> sectorMatches(value(row, "sector_trabajo"), sector))) return false;
        if (!filter.genders().isEmpty()
                && filter.genders().stream().noneMatch(gender -> genderMatches(value(row, "genero"), gender))) return false;
        if (!filter.ageRanges().isEmpty()) {
            String age = value(row, "edad_rango");
            String category = age == null ? "Sin respuesta" : canonicalAgeRange(age);
            if (filter.ageRanges().stream().noneMatch(range -> normalize(range).equals(normalize(category)))) return false;
        }
        if (!filter.postgraduateInterest().isEmpty()
                && filter.postgraduateInterest().stream().noneMatch(answer -> answer.equals(interestCategory(row)))) return false;
        return true;
    }

    /** Interés en posgrado como Sí / No / Sin respuesta (la pregunta es de opción única y obligatoria en el formulario). */
    private String interestCategory(SurveyResponseEntity row) {
        String raw = value(row, "interes_posgrado");
        if (raw == null || raw.isBlank()) return "Sin respuesta";
        return affirmative(raw) ? "Sí" : "No";
    }

    private boolean genderMatches(String actual, String requested) {
        String actualValue = normalize(actual);
        String requestedValue = normalize(requested);
        if (requestedValue.equals("mujer")) return actualValue.equals("mujer") || actualValue.equals("femenino") || actualValue.equals("female");
        if (requestedValue.equals("hombre")) return actualValue.equals("hombre") || actualValue.equals("masculino") || actualValue.equals("male");
        return actualValue.equals(requestedValue);
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

    /** Sección 10: S9=Sí para ocupados, o S8=SI para desempleados con trabajo previo. */
    private boolean isFirstEmploymentBranch(SurveyResponseEntity response) {
        if (isOccupied(response)) return isFirstEmployment(response);
        return isUnemployed(response) && affirmative(value(response, "experiencia_laboral_previa"));
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
        if ((filter == null || !filter.active()) && tituladosSql != null) {
            return tituladosSql.employmentProfile(dataset.getId());
        }
        List<SurveyResponseEntity> validRows = filteredRows(dataset.getId(), validRows(dataset.getId()), filter);
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
        return competenceGaps(datasetId, TituladosFilter.none());
    }

    /** «No observado» no entra en la media, la desviación ni la distribución: se cuenta aparte. */
    @Transactional(readOnly = true)
    public List<CompetenceAverageDto> competenceGaps(UUID datasetId, TituladosFilter filter) {
        DatasetImportEntity dataset = resolveDataset(datasetId, null);
        if ((filter == null || !filter.active()) && tituladosSql != null) {
            return tituladosSql.competenceGaps(dataset.getId());
        }
        if (filter != null && filter.active() && tituladosSql != null) {
            return tituladosSql.competenceGaps(dataset.getId(), tituladosSql.matchingIds(dataset.getId(), filter));
        }
        List<CompetenceRatingEntity> ratingRows;
        if (filter != null && filter.active() && tituladosSql != null) {
            List<UUID> matchingIds = tituladosSql.matchingIds(dataset.getId(), filter);
            if (matchingIds.isEmpty()) return List.of();
            ratingRows = ratings.findByResponse_IdIn(matchingIds);
        } else {
            ratingRows = ratings.findByResponse_Dataset_IdAndResponse_ResponseStatus(dataset.getId(), "VALIDA");
        }
        Map<String, List<CompetenceRatingEntity>> grouped = ratingRows.stream()
                .filter(r -> r.getResponse() == null || "VALIDA".equals(r.getResponse().getResponseStatus()))
                .filter(r -> filter == null || !filter.active() || matchesFilter(r.getResponse(), filter))
                .collect(Collectors.groupingBy(r -> r.getCompetence().getCode(), LinkedHashMap::new,
                        Collectors.toList()));
        List<CompetenceAverageDto> result = new ArrayList<>();
        grouped.forEach((code, competenceRatings) -> {
            var competence = competenceRatings.get(0).getCompetence();
            List<CompetenceRatingEntity> observed = competenceRatings.stream()
                    .filter(r -> !r.isNotObserved() && r.getNumericValue() != null).toList();
            long notObserved = competenceRatings.stream().filter(CompetenceRatingEntity::isNotObserved).count();
            List<Double> numbers = observed.stream().map(r -> r.getNumericValue().doubleValue()).toList();
            double average = observed.stream().mapToInt(r -> r.getNumericValue()).average().orElse(0);
            Map<Integer, Long> levelCounts = observed.stream().collect(Collectors
                    .groupingBy(r -> r.getNumericValue().intValue(), java.util.TreeMap::new, Collectors.counting()));
            int modalLevel = levelCounts.entrySet().stream()
                    .max(Map.Entry.<Integer, Long>comparingByValue().thenComparing(Map.Entry.comparingByKey()))
                    .map(Map.Entry::getKey).orElse(0);
            result.add(new CompetenceAverageDto(code, competence.getName(), competence.getCompetenceGroup(),
                    observed.size(), round(average), sampleStandardDeviation(numbers),
                    numbers.isEmpty() ? null : median(numbers), modalLevel, levelCounts, notObserved));
        });
        return result;
    }

    @Transactional(readOnly = true)
    public CrossTabulationDto cross(UUID datasetId, String rowField, String columnField) {
        return cross(datasetId, rowField, columnField, TituladosFilter.none());
    }

    public CrossTabulationDto cross(UUID datasetId, String rowField, String columnField, TituladosFilter filter) {
        DatasetImportEntity dataset = resolveDataset(datasetId, null);
        if (rowField == null || rowField.isBlank() || columnField == null || columnField.isBlank()) {
            throw new IllegalArgumentException("rowField y columnField son obligatorios");
        }
        if ("EMPLEADORES".equals(dataset.getSurveyType())
                && (!EMPLOYER_CROSS_FIELDS.contains(rowField) || !EMPLOYER_CROSS_FIELDS.contains(columnField))) {
            throw new IllegalArgumentException("Variable no disponible para empleadores: " + rowField + " / " + columnField);
        }
        if ("TITULADOS".equals(dataset.getSurveyType()) && (filter == null || !filter.active())
                && tituladosSql != null && !multiCategoryField(rowField) && !multiCategoryField(columnField)
                && !rowField.equals("segmento_titulacion") && !columnField.equals("segmento_titulacion")) {
            return tituladosSql.cross(dataset.getId(), rowField, columnField);
        }
        List<SurveyResponseEntity> valid = filteredRows(dataset.getId(), validRows(dataset.getId()), filter);
        List<SurveyResponseEntity> usable = valid.stream()
                .filter(r -> crossFieldBranchAllows(r, rowField) && crossFieldBranchAllows(r, columnField))
                .filter(r -> value(r, rowField) != null && value(r, columnField) != null).toList();
        List<String> rowCategories = usable.stream()
                .map(r -> canonicalizeCategoryValue(rowField, value(r, rowField)))
                .filter(Objects::nonNull)
                .distinct().sorted().toList();
        List<String> columnCategories = usable.stream()
                .map(r -> canonicalizeCategoryValue(columnField, value(r, columnField)))
                .filter(Objects::nonNull)
                .distinct().sorted().toList();
        Map<String, Map<String, Long>> counts = new LinkedHashMap<>();
        Map<String, Map<String, Double>> percentages = new LinkedHashMap<>();
        for (String row : rowCategories) {
            Map<String, Long> rowCounts = new LinkedHashMap<>();
            Map<String, Double> rowPercentages = new LinkedHashMap<>();
            long rowTotal = usable.stream()
                    .map(r -> canonicalizeCategoryValue(rowField, value(r, rowField)))
                    .filter(Objects::nonNull)
                    .filter(candidate -> row.equals(candidate))
                    .count();
            for (String column : columnCategories) {
                long count = usable.stream()
                        .filter(r -> row.equals(canonicalizeCategoryValue(rowField, value(r, rowField))))
                        .filter(r -> column.equals(canonicalizeCategoryValue(columnField, value(r, columnField))))
                        .count();
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

    private List<SurveyResponseEntity> validRows(UUID datasetId) {
        synchronized (validRowsCache) {
            List<SurveyResponseEntity> cached = validRowsCache.get(datasetId);
            if (cached != null) return cached;
            List<SurveyResponseEntity> loaded = List.copyOf(
                    responses.findByDataset_IdAndResponseStatus(datasetId, "VALIDA"));
            validRowsCache.put(datasetId, loaded);
            return loaded;
        }
    }

    private List<SurveyResponseEntity> filteredRows(UUID datasetId, List<SurveyResponseEntity> allRows,
                                                    TituladosFilter filter) {
        if (filter == null || !filter.active() || tituladosSql == null) {
            return applyFilter(allRows, filter);
        }
        List<UUID> ids = tituladosSql.matchingIds(datasetId, filter);
        if (ids.isEmpty()) return List.of();
        return applyFilter(responses.findAllById(ids), filter);
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
        if (value == null) return null;
        String text = String.valueOf(value);
        if ("formacion_complementaria_nivel".equals(field)) return canonicalEducationLevel(text);
        if ("edad_rango".equals(field)) return canonicalAgeRange(text);
        if ("sector_trabajo".equals(field) && normalize(text).matches("no trabaja|no trabajo")) return "Sin clasificar";
        if ("contrato_titulados_ultimos_5_anios".equals(field)) {
            return "true".equals(text) ? "Sí" : "false".equals(text) ? "No" : text;
        }
        return canonicalizeCategoryValue(field, text);
    }

    private String canonicalizeCategoryValue(String field, String value) {
        if (value == null) return null;
        String text = value.trim();
        if (text.isBlank()) return text;
        String normalized = normalize(text);
        if (List.of("area_posgrado_interes", "area_trabajo").contains(field)) {
            return switch (normalized) {
                case "ia", "inteligencia artificial" -> "Inteligencia artificial";
                case "ingenieria de software", "ingenieria de sofware" -> "Ingeniería de software";
                case "ciencia de datos" -> "Ciencia de datos";
                case "cloud computing", "cloud computing y devops", "cloud computing devops" -> "Cloud computing y DevOps";
                case "base de datos" -> "Base de datos";
                case "ciberseguridad" -> "Ciberseguridad";
                case "robotica" -> "Robótica";
                case "redes de datos y seguridad" -> "Redes de datos y seguridad";
                case "redes y telecomunicaciones" -> "Redes y telecomunicaciones";
                case "gestion empresarial" -> "Gestión empresarial";
                case "gestion de proyectos" -> "Gestión de proyectos";
                default -> text;
            };
        }
        if ("financiamiento_posgrado_estimado".equals(field)) {
            return switch (normalized) {
                case "apoyo de la empresa o institucion", "apoyo de la empresa o institución" -> "Apoyo de la empresa o institución";
                case "beca" -> "Beca";
                case "credito educativo", "crédito educativo" -> "Crédito educativo";
                case "financiamiento mixto" -> "Financiamiento mixto";
                case "recursos propios" -> "Recursos propios";
                default -> text;
            };
        }
        if ("nivel_posgrado_interes".equals(field)) {
            return switch (normalized) {
                case "diplomado" -> "Diplomado";
                case "especialidad" -> "Especialidad";
                case "maestria", "maestría" -> "Maestría";
                case "doctorado" -> "Doctorado";
                default -> text;
            };
        }
        return text;
    }

    private String canonicalEducationLevel(String value) {
        String normalized = normalize(value).replace(" ", "");
        return switch (normalized) {
            case "diplomado" -> "Diplomado";
            case "especialidad" -> "Especialidad";
            case "maestria" -> "Maestría";
            case "doctorado" -> "Doctorado";
            case "posdoctorado" -> "Posdoctorado";
            default -> value.trim();
        };
    }

    private String canonicalAgeRange(String value) {
        String normalized = normalize(value);
        if (normalized.startsWith("15") && normalized.contains("18")) return "15 - 18 años";
        if (normalized.startsWith("19") && normalized.contains("22")) return "19 - 22 años";
        if (normalized.startsWith("23") && normalized.contains("26")) return "23 - 26 años";
        if (normalized.startsWith("27") && normalized.contains("30")) return "27 - 30 años";
        if (normalized.startsWith("31") && normalized.contains("34")) return "31 - 34 años";
        if (normalized.startsWith("35") && normalized.contains("mas")) return "35 años o más";
        return value.trim();
    }

    private CategoryDistributionDto distribution(List<String> values) {
        Map<String, Long> counts = values.stream()
                .collect(Collectors.groupingBy(Function.identity(), LinkedHashMap::new, Collectors.counting()));
        Map<String, Double> percentages = new LinkedHashMap<>();
        counts.forEach((key, count) -> percentages.put(key, round(count * 100.0 / values.size())));
        return new CategoryDistributionDto(values.size(), counts, percentages);
    }

    private CategoryDistributionDto multiDistribution(String field, List<String> values) {
        List<String> options = values.stream()
                .flatMap(value -> splitMultiValue(value).stream())
                .map(String::trim).filter(value -> !value.isBlank()).toList();
        Map<String, Long> counts = options.stream()
                .collect(Collectors.groupingBy(Function.identity(), LinkedHashMap::new, Collectors.counting()));
        List<String> catalog = multiOptionCatalog(field);
        catalog.forEach(option -> counts.putIfAbsent(option, 0L));
        Map<String, Double> percentages = new LinkedHashMap<>();
        counts.forEach((key, count) -> percentages.put(key, round(count * 100.0 / values.size())));
        return new CategoryDistributionDto(values.size(), counts, percentages);
    }

    private List<String> multiOptionCatalog(String field) {
        return switch (field) {
            case "aspectos_utiles" -> List.of(
                    "La aplicación práctica de conceptos teóricos en proyectos reales.",
                    "La oportunidad de realizar pasantías o prácticas profesionales.",
                    "La distribución de los horarios de clases.",
                    "El desarrollo de habilidades analíticas y de resolución de problemas.",
                    "La colaboración de equipos multidisciplinarios para resolver problemas complejos.",
                    "La enseñanza de herramientas y software específico de la industria.");
            case "aspectos_mejorables" -> List.of(
                    "Mayor integración de la teoría con aplicaciones prácticas en el plan de estudios.",
                    "Mayor relacionamiento del estudiante con las empresas por medio de práctica profesionales.",
                    "La distribución de horarios de clases. (Horario para trabajadores, módulos virtuales, etc)",
                    "Actualización constante del plan de estudios para atender tendencias actuales.",
                    "Incremento de actividades extracurriculares (Investigación, servicio social, etc)",
                    "Ofrecimiento de más opciones de especialización.");
            case "asignaturas_ventaja" -> List.of("Introducción", "Base de Datos", "Inteligencia Artificial",
                    "Redes de Computadora", "Electivas", "T.I.S.", "Básicas (Física, Calculo, Algebras)",
                    "Planificación de Proyectos y Gestión", "Tecnología Redes Avanzadas");
            case "cargos_titulados" -> CARGO_OPTIONS;
            case "asignaturas_poco_utiles" -> List.of("Básicas (Física, Calculo, Algebras)",
                    "Aplic. Interactivas para Televisión Digital", "Telefonía IP", "Web Semánticas", "Graficación por Computadora",
                    "Robótica", "Taller de Programación en Bajo Nivel", "Teoría de Autómatas y Leng. Formales",
                    "Programación Funcional", "Teoría de Grafos", "Contabilidad Básica");
            default -> List.of();
        };
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
