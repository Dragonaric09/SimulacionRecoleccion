package com.simulacionem.encuesta.infrastructure.persistence.jdbc;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.Types;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Escritura masiva de respuestas, incidencias y valoraciones con inserciones por lotes (JDBC).
 * Evita el ciclo de JPA (merge + select por fila) que haría lenta la importación de archivos grandes.
 */
@Repository
public class SurveyResponseBatchWriter {

    private static final String INSERT_RESPONSE = """
            INSERT INTO survey_response (id, dataset_id, survey_type, source_row_number, submitted_at,
                                         response_status, raw_payload, normalized_payload)
            VALUES (?, ?, ?, ?, ?, ?, CAST(? AS jsonb), CAST(? AS jsonb))
            """;
    private static final String INSERT_TITLED = "INSERT INTO titled_response (response_id, graduation_year) VALUES (?, ?)";
    private static final String INSERT_EMPLOYER = """
            INSERT INTO employer_response (response_id, organization_type, organization_size, organization_sector,
                                           hired_graduates_last_five_years, hiring_probability, demanded_training_level,
                                           organization_department, branch_presence, competence_average,
                                           valuations_full_agreement, valuations, channel, positions)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """;
    private static final String INSERT_COMPETENCE = """
            INSERT INTO competence_rating (response_id, competence_id, numeric_value, not_observed, original_label)
            VALUES (?, ?, ?, ?, ?)
            """;
    private static final String INSERT_ISSUE = """
            INSERT INTO import_issue (dataset_id, source_row_number, source_column_index, source_column_name,
                                      original_value, severity, issue_code, message)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """;

    private final JdbcTemplate jdbc;
    private final ObjectMapper json;

    public SurveyResponseBatchWriter(JdbcTemplate jdbc, ObjectMapper json) {
        this.jdbc = jdbc;
        this.json = json;
    }

    /** Respuestas de un lote. Las filas rechazadas solo se guardan como respuesta, sin tablas hijas. */
    public void writeResponses(UUID datasetId, String surveyType, List<ResponseRow> rows) {
        if (rows.isEmpty()) return;
        jdbc.batchUpdate(INSERT_RESPONSE, rows, rows.size(), (ps, row) -> {
            ps.setObject(1, row.id());
            ps.setObject(2, datasetId);
            ps.setString(3, surveyType);
            ps.setInt(4, row.rowNumber());
            ps.setObject(5, row.submittedAt());
            ps.setString(6, row.status());
            ps.setString(7, toJson(row.raw()));
            ps.setString(8, toJson(row.normalized()));
        });
        List<ResponseRow> valid = rows.stream().filter(row -> "VALIDA".equals(row.status())).toList();
        if ("TITULADOS".equals(surveyType)) {
            jdbc.batchUpdate(INSERT_TITLED, valid, valid.size(), (ps, row) -> {
                ps.setObject(1, row.id());
                if (row.graduationYear() == null) ps.setNull(2, Types.SMALLINT);
                else ps.setShort(2, row.graduationYear());
            });
        } else if ("EMPLEADORES".equals(surveyType)) {
            List<ResponseRow> employers = valid.stream().filter(row -> row.employer() != null).toList();
            jdbc.batchUpdate(INSERT_EMPLOYER, employers, employers.size(), (ps, row) -> {
                EmployerFields e = row.employer();
                ps.setObject(1, row.id());
                ps.setString(2, fit(e.organizationType(), 100));
                ps.setString(3, fit(e.organizationSize(), 100));
                ps.setString(4, fit(e.organizationSector(), 180));
                if (e.hired() == null) ps.setNull(5, Types.BOOLEAN);
                else ps.setBoolean(5, e.hired());
                ps.setString(6, fit(e.hiringProbability(), 180));
                ps.setString(7, fit(e.demandedLevel(), 100));
                ps.setString(8, fit(e.department(), 100));
                ps.setString(9, fit(e.branch(), 100));
                if (e.competenceAverage() == null) ps.setNull(10, Types.NUMERIC);
                else ps.setBigDecimal(10, e.competenceAverage());
                ps.setShort(11, e.fullAgreement());
                ps.setArray(12, ps.getConnection().createArrayOf("smallint", e.valuations()));
                ps.setString(13, fit(e.channel(), 150));
                ps.setString(14, e.positions());
            });
        }
        List<CompetenceRow> competences = valid.stream()
                .flatMap(row -> row.competences().stream().map(c -> new CompetenceRow(row.id(), c)))
                .toList();
        jdbc.batchUpdate(INSERT_COMPETENCE, competences, competences.size(), (ps, item) -> {
            ps.setObject(1, item.responseId());
            ps.setLong(2, item.value().competenceId());
            if (item.value().numericValue() == null) ps.setNull(3, Types.SMALLINT);
            else ps.setShort(3, item.value().numericValue());
            ps.setBoolean(4, item.value().notObserved());
            ps.setString(5, fit(item.value().originalLabel(), 100));
        });
    }

    public void writeIssues(UUID datasetId, List<IssueRow> issues) {
        if (issues.isEmpty()) return;
        jdbc.batchUpdate(INSERT_ISSUE, issues, 1_000, (ps, issue) -> {
            ps.setObject(1, datasetId);
            if (issue.row() == null) ps.setNull(2, Types.INTEGER);
            else ps.setInt(2, issue.row());
            if (issue.column() == null) ps.setNull(3, Types.INTEGER);
            else ps.setInt(3, issue.column());
            ps.setString(4, issue.columnName());
            ps.setString(5, issue.originalValue());
            ps.setString(6, issue.severity());
            ps.setString(7, fit(issue.code(), 80));
            ps.setString(8, issue.message());
        });
    }

    private String toJson(Map<String, Object> value) {
        try {
            return json.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("No se pudo serializar la fila importada", ex);
        }
    }

    /** Recorta el texto a la longitud de la columna para que un valor largo no aborte el lote. */
    static String fit(String value, int max) {
        if (value == null) return null;
        return value.length() <= max ? value : value.substring(0, max);
    }

    /** Una respuesta lista para escribir. */
    public record ResponseRow(UUID id, int rowNumber, OffsetDateTime submittedAt, String status,
                              Map<String, Object> raw, Map<String, Object> normalized,
                              Short graduationYear, EmployerFields employer, List<CompetenceValue> competences) { }

    /** Campos tipados de la organización y agregados por respuesta (tabla employer_response). */
    public record EmployerFields(String organizationType, String organizationSize, String organizationSector,
                                 Boolean hired, String hiringProbability, String demandedLevel,
                                 String department, String branch, BigDecimal competenceAverage, short fullAgreement,
                                 Short[] valuations, String channel, String positions) { }

    public record CompetenceValue(long competenceId, Short numericValue, boolean notObserved, String originalLabel) { }

    /** Una incidencia de importación. */
    public record IssueRow(Integer row, Integer column, String columnName, String originalValue,
                           String severity, String code, String message) { }

    private record CompetenceRow(UUID responseId, CompetenceValue value) { }
}
