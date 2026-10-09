package com.simulacionem.encuesta.infrastructure.persistence;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public class AnalisisResultadosRepository {

    private final JdbcTemplate jdbcTemplate;

    public AnalisisResultadosRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Optional<String> findLatestResult(String tipoAnalisis, String variable1) {
        String sql = """
                SELECT resultado_json
                FROM analisis_resultados
                WHERE tipo_analisis = ? AND variable1 = ?
                ORDER BY fecha_generacion DESC, id_analisis DESC
                LIMIT 1
                """;
        return jdbcTemplate.query(sql, rs -> rs.next() ? Optional.ofNullable(rs.getString("resultado_json")) : Optional.empty(),
                tipoAnalisis, variable1);
    }

    public void saveResult(String tipoAnalisis, String variable1, String variable2, String resultadoJson) {
        jdbcTemplate.update(
                "INSERT INTO analisis_resultados (tipo_analisis, variable1, variable2, resultado_json) VALUES (?, ?, ?, ?)",
                tipoAnalisis,
                variable1,
                variable2,
                resultadoJson
        );
    }
}