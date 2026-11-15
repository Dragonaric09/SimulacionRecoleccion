package com.simulacionem.analitica.application.service;

import com.simulacionem.analitica.application.dto.ExploratoryDto;
import com.simulacionem.analitica.application.dto.ExploratoryDto.Bases;
import com.simulacionem.analitica.application.dto.ExploratoryDto.Cell;
import com.simulacionem.analitica.application.dto.ExploratoryDto.Config;
import com.simulacionem.analitica.application.dto.ExploratoryDto.Exclusion;
import com.simulacionem.analitica.application.dto.ExploratoryDto.Summary;
import com.simulacionem.analitica.application.service.EmployerVariableCatalog.Level;
import com.simulacionem.analitica.application.service.TituladosVariableCatalog.Variable;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Análisis exploratorio trivariado de titulados: tabulación cruzada de dos variables categóricas de respuesta única
 * (X, Y) con el resumen de una variable numérica (Z) en cada combinación.
 *
 * <p>Es un procedimiento descriptivo, distinto de las pruebas de asociación: no formula hipótesis ni produce valor p.
 * Por eso no aplica la regla de n mínimo de los contrastes; con un solo valor hay media, pero no desviación estándar.
 *
 * <p>Reglas de cálculo:
 * <ul>
 *   <li>Cada persona elegible cuenta una sola vez en n (clasificada por X e Y); si además tiene Z válida, cuenta en m.</li>
 *   <li>Quien no tiene Z válida se conserva en n: no se imputa cero ni se excluye en silencio.</li>
 *   <li>Desviación estándar muestral (n − 1). Mediana con el promedio de los dos centrales si m es par.</li>
 *   <li>El resumen global se calcula con los registros individuales, no promediando los resúmenes de las celdas.</li>
 * </ul>
 */
@Service
public class AnalisisExploratorioService {

    /** Variable numérica que se puede resumir: clave, etiqueta y unidad. */
    public record Medida(String key, String label, String unit, String description) { }

    /** Variables numéricas de titulados. El tiempo desempleado solo corresponde a quienes están en búsqueda laboral. */
    public static final List<Medida> MEDIDAS = List.of(
            new Medida("anios_vida_profesional", "Años de vida profesional", "años",
                    "Trayectoria profesional declarada; no es el tiempo desde la titulación."),
            new Medida("anios_desempleo", "Tiempo desempleado", "años",
                    "Solo para quienes están en búsqueda laboral; las respuestas en meses se convierten a años."));

    /** Área de posgrado de interés: casillas en el formulario original, se admite solo si nadie marcó más de una. */
    private static final Variable AREA_POSGRADO = new Variable("area_posgrado_interes", "Área de posgrado de interés",
            "Formación", Level.NOMINAL, List.of("Inteligencia artificial", "Ingeniería de software",
            "Redes de datos y seguridad", "Base de datos", "Robótica", "Ciencia de datos", "Ciberseguridad",
            "Cloud computing y DevOps"), "Mapa de calor de medias", "Área en la que haría un posgrado (solo con interés).");

    private final AnalyticsService analytics;

    public AnalisisExploratorioService(AnalyticsService analytics) {
        this.analytics = analytics;
    }

    /** Variables categóricas disponibles para X e Y. */
    public List<Variable> categoricas() {
        List<Variable> list = new ArrayList<>(TituladosVariableCatalog.VARIABLES);
        list.add(AREA_POSGRADO);
        return list;
    }

    public ExploratoryDto analizar(UUID datasetId, TituladosFilter filter, String rowField, String columnField,
                                   String valueField) {
        Variable x = categorica(rowField);
        Variable y = categorica(columnField);
        Medida z = medida(valueField);
        if (x.key().equals(y.key())) throw new IllegalArgumentException("Elige dos variables categóricas distintas");

        AnalyticsService.ExploratoryRows base = analytics.exploratoryRows(datasetId, filter, x.key(), y.key(), z.key());
        Config config = new Config("DESCRIPTIVO", x.key(), x.label(), y.key(), y.label(), z.key(), z.label(), z.unit());
        List<String> warnings = new ArrayList<>();
        List<String> absent = new ArrayList<>();
        for (String[] field : List.of(new String[]{x.key(), x.label()}, new String[]{y.key(), y.label()},
                new String[]{z.key(), z.label()})) {
            if (!base.presentFields().contains(field[0])) absent.add(field[1]);
        }
        if (!absent.isEmpty()) {
            warnings.add("El archivo no incluye " + String.join(" ni ", absent.stream().map(a -> "«" + a + "»").toList())
                    + ": la tabla no se puede calcular. Una pregunta ausente no es lo mismo que una base vacía.");
            return new ExploratoryDto(base.datasetId(), ExploratoryDto.PREGUNTA_AUSENTE, config,
                    new Bases(base.totalResponses(), base.filteredResponses(), 0, 0, List.of()),
                    List.of(), List.of(), List.of(), summary(List.of(), 0), warnings);
        }

        // Clasificación de cada persona: una sola exclusión por persona. La lista sale en el orden de las reglas
        // (no en el de las filas), para que reordenar el archivo no cambie el resultado.
        Map<String, Long> exclusions = new java.util.TreeMap<>(Comparator.comparingInt(this::ruleOrder)
                .thenComparing(Comparator.naturalOrder()));
        List<Classified> classified = new ArrayList<>();
        long multiple = 0;
        for (AnalyticsService.ExploratoryRow row : base.rows()) {
            String reason = null;
            if (!row.xApplies()) reason = "«" + x.label() + "» no corresponde según el formulario";
            else if (row.x() == null) reason = "Sin respuesta en «" + x.label() + "»";
            else if (!row.yApplies()) reason = "«" + y.label() + "» no corresponde según el formulario";
            else if (row.y() == null) reason = "Sin respuesta en «" + y.label() + "»";
            else if (isMultiple(x, row.x()) || isMultiple(y, row.y())) {
                reason = "Marcó más de una opción en una variable de respuesta única";
                multiple++;
            }
            if (reason != null) {
                exclusions.merge(reason, 1L, Long::sum);
                continue;
            }
            Double value = null;
            if (!row.zApplies()) {
                exclusions.merge("«" + z.label() + "» no corresponde según el formulario (cuenta en n, no en m)", 1L, Long::sum);
            } else {
                value = number(row.zValue());
                if (value == null) {
                    boolean text = row.zRaw() != null && !row.zRaw().isBlank();
                    exclusions.merge(text ? "«" + z.label() + "» escrita con texto no numérico (cuenta en n, no en m)"
                            : "«" + z.label() + "» vacía (cuenta en n, no en m)", 1L, Long::sum);
                }
            }
            classified.add(new Classified(row.x(), row.y(), value));
        }
        if (multiple > 0) {
            warnings.add(multiple + " persona(s) marcaron más de una opción en una variable que se trata como de respuesta"
                    + " única; quedan fuera de la tabla para no contarlas dos veces.");
        }

        List<String> rows = ordered(x, classified.stream().map(Classified::x).toList());
        List<String> columns = ordered(y, classified.stream().map(Classified::y).toList());
        List<Cell> cells = new ArrayList<>();
        for (String r : rows) {
            for (String c : columns) {
                List<Classified> group = classified.stream().filter(k -> k.x().equals(r) && k.y().equals(c)).toList();
                cells.add(new Cell(r, c, summary(group.stream().map(Classified::z).toList(), group.size())));
            }
        }
        Summary global = summary(classified.stream().map(Classified::z).toList(), classified.size());
        String status = classified.isEmpty() ? ExploratoryDto.BASE_VACIA : ExploratoryDto.OK;
        if (classified.isEmpty()) {
            warnings.add("Con los filtros y reglas aplicados no queda ninguna persona en la tabla (base vacía).");
        }
        List<Exclusion> exclusionList = exclusions.entrySet().stream()
                .map(e -> new Exclusion(e.getKey(), e.getValue())).toList();
        return new ExploratoryDto(base.datasetId(), status, config,
                new Bases(base.totalResponses(), base.filteredResponses(), global.n(), global.m(), exclusionList),
                rows, columns, cells, global, warnings);
    }

    /** Posición de cada motivo de exclusión en la lista, en el orden en que se evalúan las reglas. */
    private int ruleOrder(String reason) {
        boolean onlyZ = reason.contains("(cuenta en n, no en m)");
        if (!onlyZ && reason.contains("no corresponde")) return 0;
        if (reason.startsWith("Sin respuesta en")) return 1;
        if (reason.contains("más de una opción")) return 2;
        if (reason.contains("no corresponde")) return 3;
        if (reason.contains("vacía")) return 4;
        return 5;
    }

    // ---------------------------------------------------------------- cálculo

    private record Classified(String x, String y, Double z) { }

    /** Resumen de Z para un grupo de {@code n} personas; {@code values} trae null para quien no tiene Z válida. */
    static Summary summary(List<Double> values, long n) {
        double[] valid = values.stream().filter(java.util.Objects::nonNull).mapToDouble(Double::doubleValue).sorted().toArray();
        int m = valid.length;
        Double coverage = n == 0 ? null : 100.0 * m / n;
        if (m == 0) return new Summary(n, 0, coverage, null, null, null, null, null, n == 0 ? "SIN_OBSERVACIONES" : "SIN_MEDIDA");
        double mean = Arrays.stream(valid).sum() / m;
        double median = m % 2 == 1 ? valid[m / 2] : (valid[m / 2 - 1] + valid[m / 2]) / 2;
        Double deviation = null;
        if (m >= 2) {
            double squares = Arrays.stream(valid).map(v -> (v - mean) * (v - mean)).sum();
            deviation = Math.sqrt(squares / (m - 1));
        }
        return new Summary(n, m, coverage, mean, median, deviation, valid[0], valid[m - 1], m == 1 ? "UNA_MEDIDA" : "COMPLETO");
    }

    private static Double number(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            double parsed = Double.parseDouble(value.trim().replace(',', '.'));
            return Double.isFinite(parsed) ? parsed : null;
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    /** Orden de la escala del catálogo cuando lo hay; las categorías fuera de él van después, en orden alfabético. */
    private static List<String> ordered(Variable variable, List<String> present) {
        List<String> distinct = present.stream().distinct().toList();
        List<String> result = new ArrayList<>();
        for (String category : variable.categories()) {
            distinct.stream().filter(value -> comparable(value).equals(comparable(category)) && !result.contains(value))
                    .findFirst().ifPresent(result::add);
        }
        distinct.stream().filter(value -> !result.contains(value)).sorted(Comparator.naturalOrder()).forEach(result::add);
        return result;
    }

    private static String comparable(String value) {
        return java.text.Normalizer.normalize(value, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").toLowerCase(java.util.Locale.ROOT).replaceAll("\\s+", " ").trim();
    }

    private static boolean isMultiple(Variable variable, String value) {
        return variable == AREA_POSGRADO && (value.contains(";") || value.contains("\n"));
    }

    private Variable categorica(String key) {
        return categoricas().stream().filter(v -> v.key().equals(key)).findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Variable categórica no disponible: " + key));
    }

    private static Medida medida(String key) {
        return MEDIDAS.stream().filter(m -> m.key().equals(key)).findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Medida numérica no disponible: " + key
                        + ". Las escalas ordinales y los rangos salariales no se promedian."));
    }
}
