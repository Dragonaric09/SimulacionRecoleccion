package com.simulacionem.analitica.application.service;

import com.simulacionem.analitica.application.dto.CrossTabulationDto;
import com.simulacionem.analitica.application.dto.EmployerCrossDto;
import com.simulacionem.analitica.application.dto.EmployerCrossDto.VariableDto;
import com.simulacionem.analitica.application.service.EmployerVariableCatalog.Level;
import com.simulacionem.analitica.application.service.EmployerVariableCatalog.Variable;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeSet;

/**
 * Cruces de variables de empleadores a partir del catálogo: categorías en el orden de la escala y prueba de
 * asociación elegida según el nivel de medición de cada variable (ver {@link PruebaAsociacionService}).
 */
@Service
public class EmployerCrossService {

    static final double ALFA = 0.05;
    private static final int SMALL_SAMPLE = 30;

    private final NamedParameterJdbcTemplate jdbc;
    private final EmployerSql sql;
    private final PruebaAsociacionService pruebas;

    public EmployerCrossService(NamedParameterJdbcTemplate jdbc, EmployerSql sql, PruebaAsociacionService pruebas) {
        this.jdbc = jdbc;
        this.sql = sql;
        this.pruebas = pruebas;
    }

    /** Variables cruzables, agrupadas y en el orden del formulario. */
    public List<VariableDto> catalog() {
        return EmployerVariableCatalog.VARIABLES.stream().map(EmployerCrossService::toDto).toList();
    }

    @Transactional(readOnly = true)
    public EmployerCrossDto cross(EmployerFilters requested, String rowKey, String columnKey) {
        Variable row = variable(rowKey);
        Variable column = variable(columnKey);
        if (row.key().equals(column.key())) throw new IllegalArgumentException("Elige dos variables distintas");
        EmployerFilters filters = requested.withDataset(sql.dataset(requested.datasetId()));
        EmployerSql.Scope scope = sql.scope(filters, "");

        Map<String, Map<String, Long>> raw = new LinkedHashMap<>();
        long[] scopeTotal = {0};
        jdbc.query("SELECT r, c, count(*) AS n FROM (SELECT " + row.expression() + " AS r, " + column.expression() + " AS c"
                        + scope.from() + ") x GROUP BY r, c",
                scope.params(),
                rs -> {
                    long n = rs.getLong("n");
                    scopeTotal[0] += n;
                    String r = rs.getString("r");
                    String c = rs.getString("c");
                    if (r != null && c != null) raw.computeIfAbsent(r, k -> new LinkedHashMap<>()).merge(c, n, Long::sum);
                });

        List<String> rowCategories = categories(row, raw.keySet());
        List<String> columnCategories = categories(column,
                raw.values().stream().flatMap(m -> m.keySet().stream()).collect(java.util.stream.Collectors.toSet()));

        Map<String, Map<String, Long>> counts = new LinkedHashMap<>();
        Map<String, Map<String, Double>> percentages = new LinkedHashMap<>();
        long[][] table = new long[rowCategories.size()][columnCategories.size()];
        long total = 0;
        for (int i = 0; i < rowCategories.size(); i++) {
            String r = rowCategories.get(i);
            Map<String, Long> source = raw.getOrDefault(r, Map.of());
            long rowTotal = columnCategories.stream().mapToLong(c -> source.getOrDefault(c, 0L)).sum();
            Map<String, Long> rowCounts = new LinkedHashMap<>();
            Map<String, Double> rowPercentages = new LinkedHashMap<>();
            for (int j = 0; j < columnCategories.size(); j++) {
                long count = source.getOrDefault(columnCategories.get(j), 0L);
                table[i][j] = count;
                rowCounts.put(columnCategories.get(j), count);
                rowPercentages.put(columnCategories.get(j), rowTotal == 0 ? 0 : Math.round(count * 10_000.0 / rowTotal) / 100.0);
            }
            total += rowTotal;
            counts.put(r, rowCounts);
            percentages.put(r, rowPercentages);
        }

        CrossTabulationDto cross = new CrossTabulationDto(filters.datasetId(), row.key(), column.key(), total,
                rowCategories, columnCategories, counts, percentages, total < SMALL_SAMPLE);
        PruebaAsociacionService.ResultadoAsociacion test = pruebas.analizar(table, row.level(), column.level(), ALFA);
        return new EmployerCrossDto(cross, toDto(row), toDto(column), scopeTotal[0] - total,
                chartFor(row.level(), column.level()), test);
    }

    /**
     * Categorías del cruce: las del catálogo en su orden y, solo para variables nominales, las demás que aparezcan
     * en los datos (al final, alfabéticas). En una ordinal una categoría ajena no tiene lugar en la escala: se excluye.
     */
    private static List<String> categories(Variable variable, java.util.Set<String> present) {
        List<String> result = new ArrayList<>(variable.categories().stream().filter(present::contains).toList());
        if (variable.level() != Level.ORDINAL) {
            new TreeSet<>(present).stream().filter(c -> !variable.categories().contains(c)).forEach(result::add);
        }
        return result;
    }

    static String chartFor(Level row, Level column) {
        boolean rowOrdinal = row == Level.ORDINAL;
        boolean columnOrdinal = column == Level.ORDINAL;
        if (rowOrdinal && columnOrdinal) return "Mapa de calor con ambas escalas ordenadas: la diagonal muestra si suben juntas";
        if (rowOrdinal || columnOrdinal) return "Barras apiladas al 100 % por grupo, con la escala ordenada de menor a mayor";
        return "Barras apiladas al 100 % por fila o barras agrupadas";
    }

    private static Variable variable(String key) {
        return EmployerVariableCatalog.find(key)
                .orElseThrow(() -> new IllegalArgumentException("Variable no disponible para empleadores: " + key));
    }

    static VariableDto toDto(Variable v) {
        return new VariableDto(v.key(), v.label(), v.group(), v.level().name(), v.categories(), v.chart(), v.description());
    }
}
