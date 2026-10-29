package com.simulacionem.analitica.application.service;

import com.simulacionem.analitica.application.dto.CrossTabulationDto;
import com.simulacionem.analitica.application.dto.EmployerCrossDto;
import com.simulacionem.analitica.application.dto.EmployerCrossDto.VariableDto;
import com.simulacionem.analitica.application.dto.EmployerCrossDto.OptionAssociationDto;
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
    private static final int SMALL_SAMPLE = AnalysisRules.MINIMUM_ASSOCIATION_SAMPLE;

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

        boolean rowMultiple = row.level() == Level.MULTIPLE;
        boolean columnMultiple = column.level() == Level.MULTIPLE;
        Map<String, Map<String, Long>> raw = new LinkedHashMap<>();
        Map<String, Long> rowBases = new LinkedHashMap<>();
        Map<String, Long> columnBases = new LinkedHashMap<>();
        long[] validRespondents = {0};
        long[] scopeTotal = {0};
        jdbc.query("SELECT r, c, count(*) AS n FROM (SELECT " + row.expression() + " AS r, " + column.expression() + " AS c"
                        + scope.from() + ") x GROUP BY r, c",
                scope.params(),
                rs -> {
                    long n = rs.getLong("n");
                    scopeTotal[0] += n;
                    String r = rs.getString("r");
                    String c = rs.getString("c");
                    if (r == null || c == null) return;
                    List<String> rowValues = rowMultiple ? splitChannel(r) : List.of(r);
                    List<String> columnValues = columnMultiple ? splitChannel(c) : List.of(c);
                    if (rowValues.isEmpty() || columnValues.isEmpty()) return;
                    validRespondents[0] += n;
                    if (!columnMultiple) columnBases.merge(c, n, Long::sum);
                    for (String rowValue : rowValues) {
                        rowBases.merge(rowValue, n, Long::sum);
                        for (String columnValue : columnValues) {
                            raw.computeIfAbsent(rowValue, k -> new LinkedHashMap<>()).merge(columnValue, n, Long::sum);
                            if (columnMultiple) columnBases.merge(columnValue, n, Long::sum);
                        }
                    }
                });

        List<String> rowCategories = categories(row, raw.keySet());
        List<String> columnCategories = categories(column,
                raw.values().stream().flatMap(m -> m.keySet().stream()).collect(java.util.stream.Collectors.toSet()));

        Map<String, Map<String, Long>> counts = new LinkedHashMap<>();
        Map<String, Map<String, Double>> percentages = new LinkedHashMap<>();
        long[][] table = new long[rowCategories.size()][columnCategories.size()];
        for (int i = 0; i < rowCategories.size(); i++) {
            String r = rowCategories.get(i);
            Map<String, Long> source = raw.getOrDefault(r, Map.of());
            long rowTotal = rowBases.getOrDefault(r, 0L);
            Map<String, Long> rowCounts = new LinkedHashMap<>();
            Map<String, Double> rowPercentages = new LinkedHashMap<>();
            for (int j = 0; j < columnCategories.size(); j++) {
                long count = source.getOrDefault(columnCategories.get(j), 0L);
                table[i][j] = count;
                rowCounts.put(columnCategories.get(j), count);
                rowPercentages.put(columnCategories.get(j),
                        DescriptiveStatistics.percentageOrZero(count, rowTotal, 2));
            }
            counts.put(r, rowCounts);
            percentages.put(r, rowPercentages);
        }

        CrossTabulationDto cross = new CrossTabulationDto(filters.datasetId(), row.key(), column.key(), validRespondents[0],
                rowCategories, columnCategories, counts, percentages, validRespondents[0] < SMALL_SAMPLE,
                rowMultiple || columnMultiple, rowBases, columnBases);
        PruebaAsociacionService.ResultadoAsociacion test = rowMultiple || columnMultiple
                ? PruebaAsociacionService.ResultadoAsociacion.noAplicable(
                        row.level().name(), column.level().name(), validRespondents[0], ALFA,
                        "El cruce contiene respuestas múltiples. Una prueba sobre categorías excluyentes no es válida; se muestran frecuencias por opción y no se calcula una asociación global.")
                : pruebas.analizar(table, row.level(), column.level(), ALFA);
        List<OptionAssociationDto> optionTests = rowMultiple || columnMultiple
                ? optionTests(row, column, rowCategories, columnCategories, counts, rowBases, columnBases)
                : List.of();
        return new EmployerCrossDto(cross, toDto(row), toDto(column), scopeTotal[0] - validRespondents[0],
                chartFor(row.level(), column.level()), test, optionTests);
    }

    /** Convierte el texto de selección múltiple en opciones del formulario; las combinaciones dejan de ser categorías. */
    private static List<String> splitChannel(String value) {
        if (value == null || value.isBlank()) return List.of();
        List<String> options = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        int parenthesesDepth = 0;
        for (int i = 0; i < value.length(); i++) {
            char character = value.charAt(i);
            if (character == '(') parenthesesDepth++;
            if (character == ')' && parenthesesDepth > 0) parenthesesDepth--;
            boolean separator = character == ';' || character == '\n' || character == '\r'
                    || character == ',' && parenthesesDepth == 0;
            if (separator) {
                addChannelOption(options, current);
                current.setLength(0);
            } else {
                current.append(character);
            }
        }
        addChannelOption(options, current);
        List<String> catalog = EmployerVariableCatalog.find("medio_convocatoria").orElseThrow().categories();
        return options.stream().map(String::trim).filter(option -> !option.isBlank()).map(option -> {
            String normalized = option.toLowerCase(java.util.Locale.ROOT);
            return catalog.stream().filter(candidate -> candidate.toLowerCase(java.util.Locale.ROOT).equals(normalized))
                    .findFirst().orElseGet(() -> canonicalHistoricalChannel(option, normalized));
        }).distinct().toList();
    }

    private static void addChannelOption(List<String> options, StringBuilder value) {
        String option = value.toString().trim();
        if (!option.isBlank()) options.add(option);
    }

    private static String canonicalHistoricalChannel(String option, String normalized) {
        if (normalized.contains("contacto directo") && normalized.contains("universidad"))
            return "Contacto directo con universidades";
        if (normalized.contains("poblacion competitiva") || normalized.contains("postulacion competitiva"))
            return "Postulación competitiva (convocatorias públicas y privadas)";
        if (normalized.contains("internet") && normalized.contains("redes sociales"))
            return "Internet y Redes sociales";
        if (normalized.contains("medios escritos") && normalized.contains("audiovisuales"))
            return "Medios escritos y audiovisuales";
        if (normalized.contains("recomendacion de terceros")) return "Recomendación de terceros";
        return option;
    }

    private List<OptionAssociationDto> optionTests(Variable row, Variable column,
                                                   List<String> rowCategories, List<String> columnCategories,
                                                   Map<String, Map<String, Long>> counts,
                                                   Map<String, Long> rowBases, Map<String, Long> columnBases) {
        boolean multipleInColumns = column.level() == Level.MULTIPLE;
        List<String> options = multipleInColumns ? columnCategories : rowCategories;
        Level groupLevel = multipleInColumns ? row.level() : column.level();
        List<PruebaAsociacionService.ResultadoAsociacion> results = new ArrayList<>();
        for (String option : options) {
            List<String> groups = multipleInColumns ? rowCategories : columnCategories;
            long[][] binaryTable = new long[groups.size()][2];
            for (int i = 0; i < groups.size(); i++) {
                String group = groups.get(i);
                long base = multipleInColumns ? rowBases.getOrDefault(group, 0L) : columnBases.getOrDefault(group, 0L);
                long selected = multipleInColumns
                        ? counts.getOrDefault(group, Map.of()).getOrDefault(option, 0L)
                        : counts.getOrDefault(option, Map.of()).getOrDefault(group, 0L);
                binaryTable[i][0] = selected;
                binaryTable[i][1] = Math.max(0, base - selected);
            }
            results.add(pruebas.analizar(binaryTable, groupLevel, Level.BINARIA, ALFA));
        }
        return holm(options, results);
    }

    /** Ajuste step-down de Holm para la familia de pruebas por opción. */
    private static List<OptionAssociationDto> holm(List<String> options,
                                                   List<PruebaAsociacionService.ResultadoAsociacion> results) {
        List<Integer> tested = new ArrayList<>();
        for (int i = 0; i < results.size(); i++) if (results.get(i).pValor() != null) tested.add(i);
        tested.sort(java.util.Comparator.comparingDouble(i -> results.get(i).pValor()));
        Map<Integer, Double> adjusted = new LinkedHashMap<>();
        double previous = 0;
        for (int rank = 0; rank < tested.size(); rank++) {
            int index = tested.get(rank);
            double value = Math.min(1, (tested.size() - rank) * results.get(index).pValor());
            previous = Math.max(previous, value);
            adjusted.put(index, previous);
        }
        List<OptionAssociationDto> output = new ArrayList<>();
        for (int i = 0; i < results.size(); i++) {
            Double pHolm = adjusted.get(i);
            output.add(new OptionAssociationDto(options.get(i), results.get(i), pHolm,
                    pHolm != null && pHolm <= results.get(i).alfa()));
        }
        return List.copyOf(output);
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
        if (row == Level.MULTIPLE || column == Level.MULTIPLE)
            return "Barras horizontales independientes por opción; porcentajes sobre personas de cada grupo";
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
