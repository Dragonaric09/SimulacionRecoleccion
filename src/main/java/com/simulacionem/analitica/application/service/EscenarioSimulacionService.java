package com.simulacionem.analitica.application.service;

import org.springframework.jdbc.core.SqlTypeValue;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.core.support.AbstractSqlTypeValue;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Array;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.UUID;

/**
 * Escenarios de simulación con nombre. Son públicos y compartidos, como los datasets: la aplicación no tiene
 * usuarios. Guardan probabilidades y no conteos, así un escenario se aplica igual a otro dataset o segmento.
 */
@Service
public class EscenarioSimulacionService {

    /** Variables que ofrece la pantalla de escenarios (el área de posgrado es multirrespuesta y no se simula). */
    static final Set<String> VARIABLES = Set.of(
            "genero", "edad_rango", "situacion_laboral_actual", "sector_trabajo", "remuneracion_rango",
            "tiempo_primer_empleo", "satisfaccion_formacion", "concordancia_formacion_requerimientos",
            "interes_posgrado", "nivel_posgrado_interes", "modalidad_posgrado", "financiamiento_posgrado_estimado");
    static final Set<String> SEGMENTS = Set.of("all", "Mujer", "Hombre");
    static final int MAX_NAME = 80;
    static final int MAX_DESCRIPTION = 500;
    static final int MAX_CATEGORIES = 60;

    private final NamedParameterJdbcTemplate jdbc;

    public EscenarioSimulacionService(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true)
    public List<Scenario> listar(String variable) {
        String filter = variable == null || variable.isBlank() ? "" : " WHERE variable = :variable";
        return jdbc.query("SELECT * FROM simulation_scenario" + filter + " ORDER BY created_at DESC, name",
                new MapSqlParameterSource("variable", variable), EscenarioSimulacionService::map);
    }

    @Transactional
    public Scenario guardar(ScenarioRequest request) {
        ScenarioRequest valid = validate(request);
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("name", valid.name())
                .addValue("description", valid.description())
                .addValue("variable", valid.variable())
                .addValue("segment", valid.segment())
                .addValue("categories", sqlArray("text", valid.categories().toArray()), Types.ARRAY)
                .addValue("probabilities", sqlArray("float8", valid.probabilities().toArray()), Types.ARRAY)
                .addValue("sampleSize", valid.sampleSize())
                .addValue("repetitions", valid.repetitions())
                .addValue("seed", valid.seed())
                .addValue("datasetId", valid.datasetId());
        // Un dataset inexistente o ya eliminado no impide guardar: el escenario queda sin referencia.
        return jdbc.queryForObject("""
                INSERT INTO simulation_scenario (name, description, variable, segment, categories, probabilities,
                                                 sample_size, repetitions, seed, dataset_id)
                VALUES (:name, :description, :variable, :segment, :categories, :probabilities,
                        :sampleSize, :repetitions, :seed,
                        (SELECT id FROM dataset_import WHERE id = CAST(:datasetId AS UUID)))
                RETURNING *
                """, params, EscenarioSimulacionService::map);
    }

    @Transactional
    public void eliminar(UUID id) {
        int deleted = jdbc.update("DELETE FROM simulation_scenario WHERE id = :id", new MapSqlParameterSource("id", id));
        if (deleted == 0) throw new NoSuchElementException("El escenario no existe o ya fue eliminado");
    }

    static ScenarioRequest validate(ScenarioRequest request) {
        if (request == null) throw new IllegalArgumentException("Faltan los datos del escenario");
        String name = request.name() == null ? "" : request.name().strip().replaceAll("\\s+", " ");
        if (name.isEmpty() || name.length() > MAX_NAME) {
            throw new IllegalArgumentException("El nombre del escenario es obligatorio y admite hasta " + MAX_NAME + " caracteres");
        }
        String description = request.description() == null || request.description().isBlank() ? null : request.description().strip();
        if (description != null && description.length() > MAX_DESCRIPTION) {
            throw new IllegalArgumentException("La descripción admite hasta " + MAX_DESCRIPTION + " caracteres");
        }
        if (request.variable() == null || !VARIABLES.contains(request.variable())) {
            throw new IllegalArgumentException("La variable no está disponible para simular: " + request.variable());
        }
        String segment = request.segment() == null ? "all" : request.segment();
        if (!SEGMENTS.contains(segment)) throw new IllegalArgumentException("Segmento no válido: " + segment);
        SimulacionMultinomialService.validate(request.categories(), request.probabilities(), request.sampleSize(), request.repetitions());
        if (request.categories().size() > MAX_CATEGORIES) {
            throw new IllegalArgumentException("Un escenario admite hasta " + MAX_CATEGORIES + " categorías");
        }
        if (new HashSet<>(request.categories()).size() != request.categories().size()) {
            throw new IllegalArgumentException("Las categorías del escenario no pueden repetirse");
        }
        return new ScenarioRequest(name, description, request.variable(), segment, List.copyOf(request.categories()),
                List.copyOf(request.probabilities()), request.sampleSize(), request.repetitions(), request.seed(), request.datasetId());
    }

    private static Scenario map(ResultSet rs, int row) throws SQLException {
        return new Scenario(rs.getObject("id", UUID.class), rs.getString("name"), rs.getString("description"),
                rs.getString("variable"), rs.getString("segment"),
                Arrays.asList((String[]) array(rs.getArray("categories"))),
                Arrays.stream((Double[]) array(rs.getArray("probabilities"))).toList(),
                rs.getInt("sample_size"), rs.getInt("repetitions"), rs.getLong("seed"),
                rs.getObject("dataset_id", UUID.class), rs.getObject("created_at", OffsetDateTime.class));
    }

    /** Arreglo SQL creado sobre la conexión: un arreglo Java se expandiría como lista de parámetros. */
    private static SqlTypeValue sqlArray(String type, Object[] values) {
        return new AbstractSqlTypeValue() {
            @Override
            protected Object createTypeValue(Connection connection, int sqlType, String typeName) throws SQLException {
                return connection.createArrayOf(type, values);
            }
        };
    }

    private static Object array(Array array) throws SQLException {
        try {
            return array.getArray();
        } finally {
            array.free();
        }
    }

    public record ScenarioRequest(String name, String description, String variable, String segment,
                                  List<String> categories, List<Double> probabilities,
                                  int sampleSize, int repetitions, long seed, UUID datasetId) { }

    public record Scenario(UUID id, String name, String description, String variable, String segment,
                           List<String> categories, List<Double> probabilities,
                           int sampleSize, int repetitions, long seed, UUID datasetId, OffsetDateTime createdAt) { }
}
