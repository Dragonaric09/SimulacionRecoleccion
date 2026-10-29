package com.simulacionem.analitica.application.service;

import com.simulacionem.analitica.application.dto.CompetenceAverageDto;
import com.simulacionem.analitica.application.dto.EmploymentProfileDto;
import com.simulacionem.analitica.application.dto.CrossTabulationDto;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Prefiltro SQL para titulados. Los filtros que todavía dependen de la normalización de Java se mantienen
 * posteriormente en AnalyticsService; esta capa solo reduce el conjunto de filas cuando puede hacerlo sin
 * cambiar la semántica existente.
 */
@Component
public class TituladosSql {
    private final NamedParameterJdbcTemplate jdbc;

    public TituladosSql(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<UUID> matchingIds(UUID datasetId, TituladosFilter filter) {
        MapSqlParameterSource params = new MapSqlParameterSource("datasetId", datasetId);
        StringBuilder sql = new StringBuilder("SELECT s.id FROM survey_response s LEFT JOIN titled_response t ON t.response_id = s.id "
                + "WHERE s.dataset_id = :datasetId AND s.response_status = 'VALIDA'");

        if (filter.yearFrom() != null) {
            sql.append(" AND t.graduation_year >= :yearFrom");
            params.addValue("yearFrom", filter.yearFrom());
        }
        if (filter.yearTo() != null) {
            sql.append(" AND t.graduation_year <= :yearTo");
            params.addValue("yearTo", filter.yearTo());
        }

        addGenderFilter(sql, params, filter.genders());
        addAgeRangeFilter(sql, params, filter.ageRanges());
        addBroadTextFilter(sql, params, "t.employment_sector", "sector", filter.sectors());
        addLaborFilter(sql, params, filter.laborStatuses());
        addNormalizedIn(sql, params, "CASE WHEN t.postgraduate_interest IS NULL THEN '' WHEN t.postgraduate_interest THEN 'si' ELSE 'no' END", "postgraduate", postgraduateValues(filter.postgraduateInterest()));
        addNormalizedIn(sql, params, "s.normalized_payload ->> 'tipo_organizacion'", "organizationTypes", filter.organizationTypes());
        addNormalizedIn(sql, params, "s.normalized_payload ->> 'tamano_organizacion'", "organizationSizes", filter.organizationSizes());

        return jdbc.queryForList(sql.toString(), params, UUID.class);
    }

    /** Calcula las estadísticas de competencias directamente en PostgreSQL para el caso sin filtros. */
    public List<CompetenceAverageDto> competenceGaps(UUID datasetId) {
        return competenceGaps(datasetId, null);
    }

    /** Calcula competencias sobre un subconjunto de respuestas ya reducido por filtros SQL. */
    public List<CompetenceAverageDto> competenceGaps(UUID datasetId, List<UUID> responseIds) {
        MapSqlParameterSource params = new MapSqlParameterSource("datasetId", datasetId);
        String responseScope = "";
        if (responseIds != null) {
            if (responseIds.isEmpty()) return List.of();
            responseScope = " AND s.id IN (:responseIds)";
            params.addValue("responseIds", responseIds);
        }
        String sql = """
                SELECT c.code, c.name, c.competence_group,
                       count(*) FILTER (WHERE r.not_observed = false AND r.numeric_value IS NOT NULL) AS valid_count,
                       count(*) FILTER (WHERE r.not_observed) AS not_observed_count,
                       avg(r.numeric_value) FILTER (WHERE r.not_observed = false AND r.numeric_value IS NOT NULL) AS average,
                       stddev_samp(r.numeric_value) FILTER (WHERE r.not_observed = false AND r.numeric_value IS NOT NULL) AS deviation,
                       percentile_cont(0.5) WITHIN GROUP (ORDER BY r.numeric_value)
                           FILTER (WHERE r.not_observed = false AND r.numeric_value IS NOT NULL) AS median,
                       count(*) FILTER (WHERE r.numeric_value = 1) AS l1,
                       count(*) FILTER (WHERE r.numeric_value = 2) AS l2,
                       count(*) FILTER (WHERE r.numeric_value = 3) AS l3,
                       count(*) FILTER (WHERE r.numeric_value = 4) AS l4,
                       count(*) FILTER (WHERE r.numeric_value = 5) AS l5
                FROM competence_rating r
                JOIN survey_response s ON s.id = r.response_id
                JOIN competence_catalog c ON c.id = r.competence_id
                WHERE s.dataset_id = :datasetId AND s.response_status = 'VALIDA'""" + responseScope + """
                GROUP BY c.id, c.code, c.name, c.competence_group, c.display_order
                ORDER BY c.competence_group, c.display_order
                """;
        return jdbc.query(sql, params, (rs, row) -> {
            java.util.Map<Integer, Long> levels = new java.util.LinkedHashMap<>();
            for (int level = 1; level <= 5; level++) levels.put(level, rs.getLong("l" + level));
            int modalLevel = levels.entrySet().stream()
                    .max(java.util.Map.Entry.<Integer, Long>comparingByValue().thenComparing(java.util.Map.Entry.comparingByKey()))
                    .map(java.util.Map.Entry::getKey).orElse(0);
            return new CompetenceAverageDto(rs.getString("code"), rs.getString("name"), rs.getString("competence_group"),
                    rs.getLong("valid_count"), rs.getDouble("average"), number(rs.getObject("deviation")),
                    number(rs.getObject("median")), modalLevel, levels, rs.getLong("not_observed_count"));
        });
    }

    public FieldSummary summaryField(UUID datasetId, String field, boolean numeric) {
        return summaryField(datasetId, field, numeric, null);
    }

    public FieldSummary summaryField(UUID datasetId, String field, boolean numeric, List<UUID> responseIds) {
        MapSqlParameterSource params = new MapSqlParameterSource("datasetId", datasetId).addValue("field", field);
        String responseScope = "";
        if (responseIds != null) {
            if (responseIds.isEmpty()) return new FieldSummary(field, numeric, 0, Map.of(), null, null, null);
            responseScope = " AND s.id IN (:responseIds)";
            params.addValue("responseIds", responseIds);
        }
        if (numeric) {
            String sql = """
                    WITH values AS (
                        SELECT NULLIF(trim(s.normalized_payload ->> :field), '') AS value
                        FROM survey_response s
                        WHERE s.dataset_id = :datasetId AND s.response_status = 'VALIDA'""" + responseScope + """
                    ), numbers AS (
                        SELECT replace(value, ',', '.')::double precision AS number
                        FROM values
                        WHERE value ~ '^-?[0-9]+([.,][0-9]+)?$'
                    )
                    SELECT count(*) AS valid_count, avg(number) AS average,
                           percentile_cont(0.5) WITHIN GROUP (ORDER BY number) AS median,
                           stddev_samp(number) AS deviation
                    FROM numbers
                    """;
            return jdbc.queryForObject(sql, params, (rs, row) -> new FieldSummary(field, true, rs.getLong("valid_count"),
                    Map.of(), number(rs.getObject("average")), number(rs.getObject("median")), number(rs.getObject("deviation"))));
        }
        String excludedLabels = AnalysisRules.excludedLabelsSql();
        String sql = """
                SELECT value, count(*) AS n
                FROM (
                    SELECT NULLIF(trim(s.normalized_payload ->> :field), '') AS value
                    FROM survey_response s
                    WHERE s.dataset_id = :datasetId AND s.response_status = 'VALIDA'""" + responseScope + """
                ) values
                WHERE value IS NOT NULL
                  AND lower(value) NOT IN (""" + excludedLabels + """
)
                GROUP BY value ORDER BY value
                """;
        Map<String, Long> counts = new LinkedHashMap<>();
        jdbc.query(sql, params, (org.springframework.jdbc.core.RowCallbackHandler)
                rs -> counts.put(rs.getString("value"), rs.getLong("n")));
        long validCount = counts.values().stream().mapToLong(Long::longValue).sum();
        return new FieldSummary(field, false, validCount, counts, null, null, null);
    }

    public EmploymentProfileDto employmentProfile(UUID datasetId) {
        String sql = """
                SELECT t.graduation_year, t.professional_years
                FROM titled_response t
                JOIN survey_response s ON s.id = t.response_id
                WHERE s.dataset_id = :datasetId
                  AND s.response_status = 'VALIDA'
                  AND t.graduation_year IS NOT NULL
                  AND t.professional_years IS NOT NULL
                ORDER BY t.graduation_year, s.id
                """;
        List<EmploymentProfileDto.CohortPointDto> points = jdbc.query(sql,
                new MapSqlParameterSource("datasetId", datasetId),
                (rs, row) -> new EmploymentProfileDto.CohortPointDto(
                        rs.getShort("graduation_year"), rs.getBigDecimal("professional_years").doubleValue()));
        long validResponses = jdbc.queryForObject(
                "SELECT count(*) FROM survey_response WHERE dataset_id = :datasetId AND response_status = 'VALIDA'",
                new MapSqlParameterSource("datasetId", datasetId), Long.class);
        return new EmploymentProfileDto(datasetId, Math.toIntExact(validResponses), points);
    }

    public CrossTabulationDto cross(UUID datasetId, String rowField, String columnField) {
        String sql = """
                SELECT s.normalized_payload ->> :rowField AS row_value,
                       s.normalized_payload ->> :columnField AS column_value,
                       count(*) AS n
                FROM survey_response s
                WHERE s.dataset_id = :datasetId
                  AND s.response_status = 'VALIDA'
                  AND NULLIF(trim(s.normalized_payload ->> :rowField), '') IS NOT NULL
                  AND NULLIF(trim(s.normalized_payload ->> :columnField), '') IS NOT NULL
                GROUP BY row_value, column_value
                ORDER BY row_value, column_value
                """;
        MapSqlParameterSource params = new MapSqlParameterSource("datasetId", datasetId)
                .addValue("rowField", rowField).addValue("columnField", columnField);
        Map<String, Map<String, Long>> raw = new LinkedHashMap<>();
        jdbc.query(sql, params, (org.springframework.jdbc.core.RowCallbackHandler) rs -> raw
                .computeIfAbsent(rs.getString("row_value"), key -> new LinkedHashMap<>())
                .put(rs.getString("column_value"), rs.getLong("n")));
        List<String> rows = raw.keySet().stream().sorted().toList();
        List<String> columns = raw.values().stream().flatMap(values -> values.keySet().stream()).distinct().sorted().toList();
        Map<String, Map<String, Double>> percentages = new LinkedHashMap<>();
        long total = 0;
        for (String row : rows) {
            Map<String, Long> counts = raw.get(row);
            long rowTotal = counts.values().stream().mapToLong(Long::longValue).sum();
            total += rowTotal;
            Map<String, Double> rowPercentages = new LinkedHashMap<>();
            for (String column : columns) {
                rowPercentages.put(column,
                        DescriptiveStatistics.percentageOrZero(counts.getOrDefault(column, 0L), rowTotal, 2));
            }
            percentages.put(row, rowPercentages);
        }
        Map<String, Map<String, Long>> completeCounts = new LinkedHashMap<>();
        for (String row : rows) {
            Map<String, Long> counts = new LinkedHashMap<>();
            for (String column : columns) counts.put(column, raw.get(row).getOrDefault(column, 0L));
            completeCounts.put(row, counts);
        }
        return new CrossTabulationDto(datasetId, rowField, columnField, total, rows, columns,
                completeCounts, percentages, total < AnalyticsService.MINIMUM_SAMPLE_SIZE);
    }

    public record FieldSummary(String field, boolean numeric, long validCount, Map<String, Long> counts,
                               Double average, Double median, Double deviation) { }

    private static Double number(Object value) {
        return value instanceof Number n ? n.doubleValue() : null;
    }

    private static void addGenderFilter(StringBuilder sql, MapSqlParameterSource params, List<String> values) {
        if (values.isEmpty()) return;
        List<String> clauses = new ArrayList<>();
        for (int i = 0; i < values.size(); i++) {
            String normalized = normalize(values.get(i));
            if (normalized.equals("mujer")) {
                clauses.add(normalizedSql("t.gender") + " IN (:gender" + i + ")");
                params.addValue("gender" + i, List.of("mujer", "femenino", "female"));
            } else if (normalized.equals("hombre")) {
                clauses.add(normalizedSql("t.gender") + " IN (:gender" + i + ")");
                params.addValue("gender" + i, List.of("hombre", "masculino", "male"));
            } else {
                clauses.add(normalizedSql("t.gender") + " = :gender" + i);
                params.addValue("gender" + i, normalized);
            }
        }
        sql.append(" AND (").append(String.join(" OR ", clauses)).append(")");
    }

    private static void addBroadTextFilter(StringBuilder sql, MapSqlParameterSource params, String expression,
                                           String name, List<String> values) {
        if (values.isEmpty()) return;
        List<String> clauses = new ArrayList<>();
        String normalizedExpression = normalizedSql(expression);
        for (int i = 0; i < values.size(); i++) {
            String value = normalize(values.get(i));
            if (value.equals("sin respuesta")) {
                // La columna queda NULL cuando la pregunta no aplica: NULL = '' nunca es verdadero.
                clauses.add("coalesce(" + normalizedExpression + ", '') = ''");
            } else if (value.equals("sin clasificar")) {
                // Etiqueta con que se muestra el valor del formulario «No trabaja».
                clauses.add(normalizedExpression + " IN ('no trabaja', 'no trabajo', 'sin clasificar')");
            } else {
                String parameter = name + i;
                clauses.add(normalizedExpression + " LIKE '%' || :" + parameter + " || '%'");
                params.addValue(parameter, value);
            }
        }
        sql.append(" AND (").append(String.join(" OR ", clauses)).append(")");
    }

    private static void addAgeRangeFilter(StringBuilder sql, MapSqlParameterSource params, List<String> values) {
        if (values.isEmpty()) return;
        String age = normalizedSql("coalesce(t.age_range, '')");
        String canonical = "CASE"
                + " WHEN " + age + " LIKE '15%18%' THEN '15 - 18 anos'"
                + " WHEN " + age + " LIKE '19%22%' THEN '19 - 22 anos'"
                + " WHEN " + age + " LIKE '23%26%' THEN '23 - 26 anos'"
                + " WHEN " + age + " LIKE '27%30%' THEN '27 - 30 anos'"
                + " WHEN " + age + " LIKE '31%34%' THEN '31 - 34 anos'"
                + " WHEN " + age + " LIKE '35%mas%' THEN '35 anos o mas'"
                + " ELSE " + age + " END";
        List<String> normalized = normalized(values);
        params.addValue("ageRanges", normalized);
        sql.append(" AND ").append(canonical).append(" IN (:ageRanges)");
    }

    private static void addLaborFilter(StringBuilder sql, MapSqlParameterSource params, List<String> values) {
        if (values.isEmpty()) return;
        String status = normalizedSql("t.current_employment_status");
        String category = "CASE WHEN " + status + " = '' THEN 'sin respuesta'"
                + " WHEN " + status + " LIKE '%emprend%' THEN 'emprendimiento propio'"
                + " WHEN " + status + " LIKE '%no trabaja%' OR " + status + " LIKE '%no trabajo%'"
                + " OR " + status + " LIKE '%busqueda%' OR " + status + " LIKE '%desemple%'"
                + " THEN 'actualmente no trabaja'"
                + " WHEN " + status + " LIKE '%trabaja en%' OR " + status + " LIKE '%organizacion%'"
                + " THEN 'trabaja en una organizacion' ELSE " + status + " END";
        List<String> clauses = new ArrayList<>();
        for (String raw : values) {
            String value = normalize(raw);
            String parameter = "labor" + clauses.size();
            clauses.add(category + " = :" + parameter);
            params.addValue(parameter, value);
        }
        sql.append(" AND (").append(String.join(" OR ", clauses)).append(")");
    }

    private static void addNormalizedIn(StringBuilder sql, MapSqlParameterSource params, String expression,
                                        String name, List<String> values) {
        if (values.isEmpty()) return;
        List<String> normalized = normalized(values);
        params.addValue(name, normalized);
        String column = "coalesce(" + expression + ", '')";
        sql.append(" AND ").append(normalizedSql(column)).append(" IN (:").append(name).append(")");
    }

    private static List<String> postgraduateValues(List<String> values) {
        List<String> result = new ArrayList<>();
        for (String value : values) {
            String normalized = normalize(value);
            if (normalized.equals("si")) result.add("si");
            else if (normalized.equals("no")) result.add("no");
            else result.add(normalized);
        }
        return result;
    }

    private static List<String> normalized(List<String> values) {
        List<String> result = new ArrayList<>(values.stream().map(TituladosSql::normalize).distinct().toList());
        if (result.contains("sin respuesta") && !result.contains("")) result.add("");
        return result;
    }

    private static String normalizedSql(String expression) {
        return "regexp_replace(lower(translate(" + expression
                + ", 'áéíóúüÁÉÍÓÚÜ', 'aeiouuAEIOUU')), '\\\\s+', ' ', 'g')";
    }

    private static String normalize(String value) {
        return value == null ? "" : java.text.Normalizer.normalize(value, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").toLowerCase(java.util.Locale.ROOT)
                .replaceAll("\\s+", " ").trim();
    }
}
