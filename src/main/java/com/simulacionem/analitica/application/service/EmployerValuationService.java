package com.simulacionem.analitica.application.service;

import com.simulacionem.analitica.application.dto.EmployerValuationDto;
import com.simulacionem.analitica.application.dto.EmployerValuationDto.Correlations;
import com.simulacionem.analitica.application.dto.EmployerValuationDto.Dimension;
import com.simulacionem.analitica.application.dto.EmployerValuationDto.Item;
import com.simulacionem.analitica.application.dto.EmployerValuationDto.KnowledgeMatrix;
import com.simulacionem.analitica.application.dto.EmployerValuationDto.Segment;
import com.simulacionem.analitica.application.dto.EmployerValuationDto.SegmentGroup;
import com.simulacionem.analitica.application.dto.EmployerValuationDto.Summary;
import com.simulacionem.analitica.application.service.EmployerVariableCatalog.Level;
import com.simulacionem.analitica.application.service.EmployerVariableCatalog.Variable;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Array;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.function.Function;

/**
 * Lectura de las 18 afirmaciones de valoración agrupadas en dimensiones (ver docs/analisis-encuesta-empleadores.md):
 * puntaje por dimensión y afirmación, comparación entre segmentos de organizaciones, la relación entre conocer el
 * perfil de egreso y juzgarlo coherente con el desempeño, y la correlación entre dimensiones.
 *
 * Se lee una fila corta por organización (el arreglo tipado de valoraciones y cuatro columnas de segmentación);
 * con decenas de miles de respuestas sigue siendo una sola consulta secuencial.
 */
@Service
public class EmployerValuationService {

    static final double ALFA = 0.05;
    private static final int ITEMS = EmployerVariableCatalog.VALUATION_ITEMS.size();
    /** Códigos de employer_response.valuations. */
    private static final int FULL = 1, PARTIAL = 2, DISAGREE = 3, UNKNOWN = 4;

    /** @param positions posiciones 1..18 en employer_response.valuations */
    record DimensionDef(String key, String label, String description, int... positions) { }

    static final List<DimensionDef> DIMENSIONS = List.of(
            new DimensionDef("confianza", "Confianza en la formación",
                    "Confianza en la Carrera, consistencia del título y formación para un desempeño destacado.", 1, 2, 6),
            new DimensionDef("desempeno", "Desempeño y perfil",
                    "Coherencia del perfil con el desempeño, competencias laborales y valores de los titulados.", 5, 8, 9),
            new DimensionDef("conocimiento", "Conocimiento del perfil",
                    "Si el empleador conoce el perfil de egreso de la Carrera.", 4),
            new DimensionDef("escucha", "Escucha de la Carrera",
                    "Si la Carrera consulta al empleador e incorpora las necesidades del sector.", 3, 7, 15, 16, 18),
            new DimensionDef("participacion", "Participación del empleador",
                    "Participación del empleador en retroalimentación, vinculación y difusión.", 10, 12, 13, 14),
            new DimensionDef("vinculacion", "Vinculación laboral",
                    "Vínculos con organizaciones y si recurre a la Universidad para contratar.", 11, 17));

    private static final List<String> SEGMENT_KEYS = List.of(
            "tipo_organizacion", "tamano_organizacion", "contrato_titulados_ultimos_5_anios", "posibilidad_incorporacion");

    private final NamedParameterJdbcTemplate jdbc;
    private final EmployerSql sql;
    private final PruebaAsociacionService pruebas;

    public EmployerValuationService(NamedParameterJdbcTemplate jdbc, EmployerSql sql, PruebaAsociacionService pruebas) {
        this.jdbc = jdbc;
        this.sql = sql;
        this.pruebas = pruebas;
    }

    /** Una organización: códigos de valoración (0 = vacía) y las variables de segmentación. */
    record Row(int[] codes, Map<String, String> segments) {
        Double itemScore(int position) {
            return score(codes[position - 1]);
        }

        Double dimension(DimensionDef d) {
            double sum = 0;
            int count = 0;
            for (int p : d.positions()) {
                Double s = itemScore(p);
                if (s != null) { sum += s; count++; }
            }
            return count == 0 ? null : sum / count;
        }

        Double overall() {
            double sum = 0;
            int count = 0;
            for (int code : codes) {
                Double s = score(code);
                if (s != null) { sum += s; count++; }
            }
            return count == 0 ? null : sum / count;
        }

        boolean uniform() {
            return codes[0] != 0 && Arrays.stream(codes).allMatch(c -> c == codes[0]);
        }
    }

    static Double score(int code) {
        return switch (code) {
            case FULL -> 100.0;
            case PARTIAL -> 50.0;
            case DISAGREE -> 0.0;
            default -> null;
        };
    }

    @Transactional(readOnly = true)
    public EmployerValuationDto insights(EmployerFilters requested) {
        EmployerFilters filters = requested.withDataset(sql.dataset(requested.datasetId()));
        EmployerSql.Scope scope = sql.scope(filters, "");
        List<Variable> segmentVariables = SEGMENT_KEYS.stream().map(k -> EmployerVariableCatalog.find(k).orElseThrow()).toList();
        String segmentColumns = String.join(", ", segmentVariables.stream().map(v -> v.expression() + " AS " + v.key()).toList());
        List<Row> rows = jdbc.query("SELECT e.valuations, " + segmentColumns + scope.from(), scope.params(), (rs, i) -> {
            Map<String, String> segments = new LinkedHashMap<>();
            for (Variable v : segmentVariables) segments.put(v.key(), rs.getString(v.key()));
            return new Row(codes(rs.getArray("valuations")), segments);
        });

        long total = filters.active()
                ? jdbc.getJdbcOperations().queryForObject(
                        "SELECT count(*) FROM survey_response WHERE dataset_id = ? AND response_status = 'VALIDA'",
                        Long.class, filters.datasetId())
                : rows.size();
        List<Item> items = items(rows);
        List<Dimension> dimensions = dimensions(items, rows);
        return new EmployerValuationDto(filters.datasetId(), summary(total, rows, items, dimensions), dimensions, items,
                segmentVariables.stream().map(v -> segment(v, rows)).toList(), knowledge(rows), correlations(rows));
    }

    private static int[] codes(Array array) throws SQLException {
        int[] codes = new int[ITEMS];
        if (array == null) return codes;
        Object[] values = (Object[]) array.getArray();
        for (int i = 0; i < Math.min(values.length, ITEMS); i++) {
            int code = values[i] instanceof Number n ? n.intValue() : 0;
            codes[i] = code >= FULL && code <= UNKNOWN ? code : 0;
        }
        return codes;
    }

    // ---------------------------------------------------------------- afirmaciones y dimensiones

    private static List<Item> items(List<Row> rows) {
        List<Item> items = new ArrayList<>();
        for (int i = 0; i < ITEMS; i++) {
            long[] count = new long[5];
            for (Row row : rows) count[row.codes()[i]]++;
            int position = i + 1;
            String[] meta = EmployerVariableCatalog.VALUATION_ITEMS.get(i);
            long answered = count[FULL] + count[PARTIAL] + count[DISAGREE];
            items.add(new Item(position, meta[0], meta[1], dimensionOf(position),
                    count[FULL], count[PARTIAL], count[DISAGREE], count[UNKNOWN], count[0],
                    answered == 0 ? null : round((count[FULL] * 100.0 + count[PARTIAL] * 50.0) / answered),
                    answered == 0 ? null : round((count[FULL] - count[DISAGREE]) * 100.0 / answered)));
        }
        return items;
    }

    private static String dimensionOf(int position) {
        return DIMENSIONS.stream().filter(d -> Arrays.stream(d.positions()).anyMatch(p -> p == position))
                .map(DimensionDef::key).findFirst().orElse(null);
    }

    private static List<Dimension> dimensions(List<Item> items, List<Row> rows) {
        List<Dimension> result = new ArrayList<>();
        for (DimensionDef d : DIMENSIONS) {
            long full = 0, partial = 0, disagree = 0, unknown = 0;
            List<String> keys = new ArrayList<>();
            for (int p : d.positions()) {
                Item item = items.get(p - 1);
                keys.add(item.key());
                full += item.full();
                partial += item.partial();
                disagree += item.disagreement();
                unknown += item.unknown();
            }
            long answered = full + partial + disagree;
            long respondents = rows.stream().filter(r -> r.dimension(d) != null).count();
            result.add(new Dimension(d.key(), d.label(), d.description(), keys,
                    answered == 0 ? null : round((full * 100.0 + partial * 50.0) / answered),
                    share(full, answered), share(partial, answered), share(disagree, answered),
                    share(unknown, answered + unknown), answered, respondents));
        }
        return result;
    }

    private static Summary summary(long total, List<Row> rows, List<Item> items, List<Dimension> dimensions) {
        long full = items.stream().mapToLong(Item::full).sum();
        long partial = items.stream().mapToLong(Item::partial).sum();
        long disagree = items.stream().mapToLong(Item::disagreement).sum();
        long unknown = items.stream().mapToLong(Item::unknown).sum();
        long answered = full + partial + disagree;
        List<Dimension> scored = dimensions.stream().filter(d -> d.score() != null).toList();
        String strongest = scored.stream().max(Comparator.comparing(Dimension::score)).map(Dimension::key).orElse(null);
        String weakest = scored.stream().min(Comparator.comparing(Dimension::score)).map(Dimension::key).orElse(null);
        return new Summary(total, rows.size(),
                answered == 0 ? null : round((full * 100.0 + partial * 50.0) / answered),
                share(full, answered), share(disagree, answered), share(unknown, answered + unknown),
                rows.stream().filter(Row::uniform).count(),
                scored.size() > 1 ? strongest : null, scored.size() > 1 ? weakest : null);
    }

    // ---------------------------------------------------------------- segmentos

    /**
     * Puntaje por grupo y prueba sobre el puntaje global: los puntajes distintos, ordenados, forman las columnas de una
     * tabla grupos × puntaje, de modo que la prueba (Mann–Whitney, Kruskal–Wallis o Spearman) se elige por el nivel
     * de la variable de segmentación.
     */
    private Segment segment(Variable variable, List<Row> rows) {
        Map<String, List<Row>> groups = new LinkedHashMap<>();
        variable.categories().forEach(c -> groups.put(c, new ArrayList<>()));
        for (Row row : rows) {
            String category = row.segments().get(variable.key());
            if (category == null || row.overall() == null) continue;
            if (!groups.containsKey(category)) {
                if (variable.level() == Level.ORDINAL) continue;
                groups.put(category, new ArrayList<>());
            }
            groups.get(category).add(row);
        }
        List<SegmentGroup> result = new ArrayList<>();
        TreeMap<Double, Integer> scoreIndex = new TreeMap<>();
        groups.values().forEach(list -> list.forEach(r -> scoreIndex.putIfAbsent(roundKey(r.overall()), 0)));
        int column = 0;
        for (Map.Entry<Double, Integer> entry : scoreIndex.entrySet()) entry.setValue(column++);
        List<long[]> table = new ArrayList<>();
        for (Map.Entry<String, List<Row>> group : groups.entrySet()) {
            List<Row> members = group.getValue();
            if (members.isEmpty()) continue;
            Map<String, Double> byDimension = new LinkedHashMap<>();
            for (DimensionDef d : DIMENSIONS) byDimension.put(d.key(), mean(members, r -> r.dimension(d)));
            result.add(new SegmentGroup(group.getKey(), members.size(), mean(members, Row::overall), byDimension));
            long[] counts = new long[scoreIndex.size()];
            members.forEach(r -> counts[scoreIndex.get(roundKey(r.overall()))]++);
            table.add(counts);
        }
        PruebaAsociacionService.ResultadoAsociacion test = scoreIndex.isEmpty() ? null
                : pruebas.analizar(table.toArray(long[][]::new), variable.level(), Level.ORDINAL, ALFA);
        return new Segment(variable.key(), variable.label(), variable.level().name(), result, test);
    }

    private static Double mean(List<Row> rows, Function<Row, Double> value) {
        double sum = 0;
        int count = 0;
        for (Row row : rows) {
            Double v = value.apply(row);
            if (v != null) { sum += v; count++; }
        }
        return count == 0 ? null : round(sum / count);
    }

    // ---------------------------------------------------------------- conocimiento × desempeño

    private KnowledgeMatrix knowledge(List<Row> rows) {
        // Filas: conoce el perfil de egreso (f4). Columnas: perfil coherente con el desempeño (f5).
        long[][] counts = new long[3][3];
        long excluded = 0;
        for (Row row : rows) {
            int knows = agreementIndex(row.codes()[3]);
            int coherent = agreementIndex(row.codes()[4]);
            if (knows < 0 || coherent < 0) { excluded++; continue; }
            counts[knows][coherent]++;
        }
        return new KnowledgeMatrix(EmployerVariableCatalog.AGREEMENT, counts, excluded,
                pruebas.analizar(counts, Level.ORDINAL, Level.ORDINAL, ALFA));
    }

    /** Índice en {@link EmployerVariableCatalog#AGREEMENT} (desacuerdo → acuerdo), o −1 si no sabe o está vacía. */
    private static int agreementIndex(int code) {
        return switch (code) {
            case DISAGREE -> 0;
            case PARTIAL -> 1;
            case FULL -> 2;
            default -> -1;
        };
    }

    // ---------------------------------------------------------------- correlaciones

    private static Correlations correlations(List<Row> rows) {
        int k = DIMENSIONS.size();
        Double[][] rho = new Double[k][k];
        Double[][] p = new Double[k][k];
        long[][] n = new long[k][k];
        for (int a = 0; a < k; a++) {
            for (int b = a; b < k; b++) {
                if (a == b) {
                    final DimensionDef d = DIMENSIONS.get(a);
                    n[a][a] = rows.stream().filter(r -> r.dimension(d) != null).count();
                    rho[a][a] = n[a][a] > 0 ? 1.0 : null;
                    continue;
                }
                List<double[]> pairs = new ArrayList<>();
                for (Row row : rows) {
                    Double x = row.dimension(DIMENSIONS.get(a));
                    Double y = row.dimension(DIMENSIONS.get(b));
                    if (x != null && y != null) pairs.add(new double[]{x, y});
                }
                n[a][b] = n[b][a] = pairs.size();
                if (pairs.size() >= 3) {
                    Double r = spearman(pairs);
                    rho[a][b] = rho[b][a] = r == null ? null : Math.round(r * 1000.0) / 1000.0;
                    if (r != null && pairs.size() >= SeleccionPruebaEstadisticaService.MUESTRA_MINIMA) {
                        double pv = PruebaAsociacionService.pSpearmanT(r, pairs.size());
                        p[a][b] = p[b][a] = Math.round(pv * 1_000_000.0) / 1_000_000.0;
                    }
                }
            }
        }
        return new Correlations(DIMENSIONS.stream().map(DimensionDef::key).toList(),
                DIMENSIONS.stream().map(DimensionDef::label).toList(), rho, p, n);
    }

    /** ρ de Spearman con rangos medios; null si alguna de las dos variables es constante. */
    static Double spearman(List<double[]> pairs) {
        double[] x = ranks(pairs.stream().mapToDouble(v -> v[0]).toArray());
        double[] y = ranks(pairs.stream().mapToDouble(v -> v[1]).toArray());
        double mx = Arrays.stream(x).average().orElse(0);
        double my = Arrays.stream(y).average().orElse(0);
        double cov = 0, vx = 0, vy = 0;
        for (int i = 0; i < x.length; i++) {
            cov += (x[i] - mx) * (y[i] - my);
            vx += (x[i] - mx) * (x[i] - mx);
            vy += (y[i] - my) * (y[i] - my);
        }
        return vx == 0 || vy == 0 ? null : cov / Math.sqrt(vx * vy);
    }

    static double[] ranks(double[] values) {
        Integer[] order = new Integer[values.length];
        for (int i = 0; i < order.length; i++) order[i] = i;
        Arrays.sort(order, Comparator.comparingDouble(i -> values[i]));
        double[] ranks = new double[values.length];
        int i = 0;
        while (i < order.length) {
            int j = i;
            while (j + 1 < order.length && values[order[j + 1]] == values[order[i]]) j++;
            double rank = (i + j) / 2.0 + 1;
            for (int m = i; m <= j; m++) ranks[order[m]] = rank;
            i = j + 1;
        }
        return ranks;
    }

    // ---------------------------------------------------------------- utilidades

    private static Double share(long part, long base) {
        return base == 0 ? null : round(part * 100.0 / base);
    }

    private static double round(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private static double roundKey(double value) {
        return Math.round(value * 10_000.0) / 10_000.0;
    }
}
