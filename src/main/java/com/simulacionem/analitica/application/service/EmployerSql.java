package com.simulacionem.analitica.application.service;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

/**
 * Piezas SQL comunes a los servicios de empleadores: resolución del dataset y la cláusula FROM/WHERE con los
 * filtros. Las columnas son fijas; los valores de los filtros entran siempre como parámetros con nombre.
 */
@Component
public class EmployerSql {

    public static final String NO_ANSWER = "Sin respuesta";

    private final NamedParameterJdbcTemplate jdbc;

    public EmployerSql(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** Cláusula FROM/WHERE con los parámetros ya ligados. */
    public record Scope(String from, MapSqlParameterSource params) {
        /** Copia de los parámetros con uno más, para no modificar el alcance compartido. */
        public MapSqlParameterSource paramsWith(String name, Object value) {
            return new MapSqlParameterSource(params.getValues()).addValue(name, value);
        }
    }

    /** Dataset de empleadores indicado, o el último importado si no se indica ninguno. */
    public UUID dataset(UUID datasetId) {
        if (datasetId == null) {
            List<UUID> latest = jdbc.getJdbcOperations().queryForList(
                    "SELECT id FROM dataset_import WHERE survey_type = 'EMPLEADORES' ORDER BY imported_at DESC LIMIT 1",
                    UUID.class);
            if (latest.isEmpty()) throw new NoSuchElementException("No existe un dataset de empleadores importado");
            return latest.get(0);
        }
        List<String> type = jdbc.getJdbcOperations().queryForList(
                "SELECT survey_type FROM dataset_import WHERE id = ?", String.class, datasetId);
        if (type.isEmpty()) throw new NoSuchElementException("El dataset solicitado no existe o fue eliminado");
        if (!"EMPLEADORES".equals(type.get(0))) throw new IllegalArgumentException("El dataset no corresponde a empleadores");
        return datasetId;
    }

    /**
     * Respuestas válidas del dataset con los filtros aplicados. {@code extraJoin} añade uniones (competencias,
     * valoraciones, casillas) entre la tabla de respuestas y el WHERE.
     */
    public Scope scope(EmployerFilters filters, String extraJoin) {
        MapSqlParameterSource params = new MapSqlParameterSource("datasetId", filters.datasetId());
        StringBuilder from = new StringBuilder(" FROM survey_response s JOIN employer_response e ON e.response_id = s.id ")
                .append(extraJoin)
                .append(" WHERE s.dataset_id = :datasetId AND s.response_status = 'VALIDA'");
        in(from, params, "e.organization_type", "types", filters.types());
        in(from, params, "e.organization_size", "sizes", filters.sizes());
        in(from, params, "e.organization_sector", "sectors", filters.sectors());
        in(from, params, "e.organization_department", "departments", filters.departments());
        in(from, params, "e.hiring_probability", "probabilities", filters.probabilities());
        hired(from, params, filters.hired());
        return new Scope(from.toString(), params);
    }

    private static void in(StringBuilder from, MapSqlParameterSource params, String column, String name, List<String> values) {
        if (values.isEmpty()) return;
        boolean includeMissing = values.contains(NO_ANSWER);
        List<String> answered = values.stream().filter(v -> !NO_ANSWER.equals(v)).toList();
        if (answered.isEmpty()) {
            from.append(" AND ").append(column).append(" IS NULL");
            return;
        }
        params.addValue(name, answered);
        from.append(" AND (").append(column).append(" IN (:").append(name).append(")");
        if (includeMissing) from.append(" OR ").append(column).append(" IS NULL");
        from.append(")");
    }

    private static void hired(StringBuilder from, MapSqlParameterSource params, List<String> values) {
        if (values.isEmpty()) return;
        List<Boolean> flags = values.stream().filter(v -> !NO_ANSWER.equals(v)).map(v -> v.equalsIgnoreCase("Sí") || v.equalsIgnoreCase("Si")).toList();
        boolean includeMissing = values.contains(NO_ANSWER);
        if (flags.isEmpty()) {
            from.append(" AND e.hired_graduates_last_five_years IS NULL");
            return;
        }
        params.addValue("hired", flags);
        from.append(" AND (e.hired_graduates_last_five_years IN (:hired)");
        if (includeMissing) from.append(" OR e.hired_graduates_last_five_years IS NULL");
        from.append(")");
    }
}
