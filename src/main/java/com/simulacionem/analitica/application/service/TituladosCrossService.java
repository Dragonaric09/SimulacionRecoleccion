package com.simulacionem.analitica.application.service;

import com.simulacionem.analitica.application.dto.AnalyticsSummaryDto;
import com.simulacionem.analitica.application.dto.CrossTabulationDto;
import com.simulacionem.analitica.application.dto.EmployerCrossDto.VariableDto;
import com.simulacionem.analitica.application.dto.TituladosCrossDto;
import com.simulacionem.analitica.application.service.EmployerVariableCatalog.Level;
import com.simulacionem.analitica.application.service.TituladosVariableCatalog.Variable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Servicio de inferencia bivariada para Titulados, paralelo al de Empleadores. */
@Service
public class TituladosCrossService {

    private static final double ALFA = 0.05;
    private final AnalyticsService analytics;
    private final PruebaAsociacionService pruebas;

    public TituladosCrossService(AnalyticsService analytics, PruebaAsociacionService pruebas) {
        this.analytics = analytics;
        this.pruebas = pruebas;
    }

    public List<VariableDto> catalog() {
        return TituladosVariableCatalog.VARIABLES.stream().map(TituladosCrossService::toDto).toList();
    }

    @Transactional(readOnly = true)
    public TituladosCrossDto cross(java.util.UUID datasetId, TituladosFilter filter, String rowKey, String columnKey) {
        Variable row = variable(rowKey);
        Variable column = variable(columnKey);
        if (row.key().equals(column.key())) throw new IllegalArgumentException("Elige dos variables distintas");

        CrossTabulationDto source = analytics.crossForAnalysis(datasetId, row.key(), column.key(), filter);
        CrossTabulationDto ordered = orderCategories(source, row, column);
        long[][] table = frequencies(ordered);
        AnalyticsSummaryDto scope = analytics.summary(datasetId, "TITULADOS", List.of(), filter);
        long excluded = Math.max(0, scope.validResponses() - ordered.validCount());
        return new TituladosCrossDto(ordered, toDto(row), toDto(column), excluded,
                chartFor(row.level(), column.level()), pruebas.analizar(table, row.level(), column.level(), ALFA));
    }

    private static CrossTabulationDto orderCategories(CrossTabulationDto source, Variable row, Variable column) {
        List<String> rows = ordered(row, source.rowCategories());
        List<String> columns = ordered(column, source.columnCategories());
        Map<String, Map<String, Long>> counts = new LinkedHashMap<>();
        Map<String, Map<String, Double>> percentages = new LinkedHashMap<>();
        for (String rowCategory : rows) {
            Map<String, Long> rowCounts = new LinkedHashMap<>();
            Map<String, Double> rowPercentages = new LinkedHashMap<>();
            long rowTotal = columns.stream().mapToLong(category -> source.counts().getOrDefault(rowCategory, Map.of()).getOrDefault(category, 0L)).sum();
            for (String columnCategory : columns) {
                long count = source.counts().getOrDefault(rowCategory, Map.of()).getOrDefault(columnCategory, 0L);
                rowCounts.put(columnCategory, count);
                rowPercentages.put(columnCategory, DescriptiveStatistics.percentageOrZero(count, rowTotal, 2));
            }
            counts.put(rowCategory, rowCounts);
            percentages.put(rowCategory, rowPercentages);
        }
        return new CrossTabulationDto(source.datasetId(), source.rowField(), source.columnField(), source.validCount(),
                rows, columns, counts, percentages, source.smallSample());
    }

    private static List<String> ordered(Variable variable, List<String> present) {
        if (variable.level() == Level.ORDINAL && "remuneracion_rango".equals(variable.key())) {
            return present.stream().sorted(Comparator.comparingInt(TituladosCrossService::salaryLowerBound)).toList();
        }
        List<String> categories = new ArrayList<>(variable.categories().stream().filter(present::contains).toList());
        present.stream().filter(category -> !categories.contains(category)).sorted(Comparator.naturalOrder()).forEach(categories::add);
        return categories;
    }

    private static int salaryLowerBound(String category) {
        String normalized = java.text.Normalizer.normalize(category, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").toLowerCase(java.util.Locale.ROOT);
        if (normalized.contains("menos") || normalized.contains("menor")) return 0;
        if (normalized.contains("mas")) return Integer.MAX_VALUE;
        java.util.regex.Matcher number = java.util.regex.Pattern.compile("\\d[\\d.]*").matcher(normalized);
        if (!number.find()) return Integer.MAX_VALUE - 1;
        try {
            return Integer.parseInt(number.group().replace(".", ""));
        } catch (NumberFormatException ignored) {
            return Integer.MAX_VALUE - 1;
        }
    }

    private static long[][] frequencies(CrossTabulationDto cross) {
        long[][] table = new long[cross.rowCategories().size()][cross.columnCategories().size()];
        for (int i = 0; i < table.length; i++) for (int j = 0; j < table[i].length; j++) {
            table[i][j] = cross.counts().getOrDefault(cross.rowCategories().get(i), Map.of())
                    .getOrDefault(cross.columnCategories().get(j), 0L);
        }
        return table;
    }

    private static String chartFor(Level row, Level column) {
        return EmployerCrossService.chartFor(row, column);
    }

    private static Variable variable(String key) {
        return TituladosVariableCatalog.find(key)
                .orElseThrow(() -> new IllegalArgumentException("Variable no disponible para el análisis de titulados: " + key));
    }

    private static VariableDto toDto(Variable variable) {
        return new VariableDto(variable.key(), variable.label(), variable.group(), variable.level().name(),
                variable.categories(), variable.chart(), variable.description());
    }
}
