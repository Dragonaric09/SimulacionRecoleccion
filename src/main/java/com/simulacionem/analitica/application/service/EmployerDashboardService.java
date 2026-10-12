package com.simulacionem.analitica.application.service;

import com.simulacionem.analitica.application.dto.CrossTabulationDto;
import com.simulacionem.analitica.application.dto.EmployerDashboardDto;
import com.simulacionem.analitica.application.dto.EmployerDashboardDto.CompetenceDto;
import com.simulacionem.analitica.application.dto.EmployerDashboardDto.CountDto;
import com.simulacionem.analitica.application.dto.EmployerDashboardDto.DistributionDto;
import com.simulacionem.analitica.application.dto.EmployerDashboardDto.GroupBalanceDto;
import com.simulacionem.analitica.application.dto.EmployerDashboardDto.HiringMatrixCellDto;
import com.simulacionem.analitica.application.dto.EmployerDashboardDto.KpiDto;
import com.simulacionem.analitica.application.dto.EmployerDashboardDto.SizeCompetenceDto;
import com.simulacionem.analitica.application.dto.EmployerDashboardDto.TimePointDto;
import com.simulacionem.analitica.application.dto.EmployerDashboardDto.ValuationDto;
import com.simulacionem.analitica.application.dto.EmployerResponsePageDto;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Agregados del dashboard de empleadores sobre el dataset completo, calculados en PostgreSQL.
 *
 * Un dataset de decenas de miles de respuestas se resume en pocas filas por consulta: el navegador nunca
 * recibe las respuestas, solo totales, distribuciones y una página de la tabla detallada.
 * Las consultas son fijas. Los filtros (tipo y tamaño de organización) entran como parámetros con nombre.
 */
@Service
public class EmployerDashboardService {

    /** Respuestas mínimas en cada periodo para calcular una variación. */
    static final int MIN_BASE = 5;
    /** Respuestas por debajo de las cuales la pantalla avisa de muestra pequeña. */
    static final int SMALL_SAMPLE = 5;
    /** Por encima de este número de días, la serie temporal se agrupa por semana. */
    static final long WEEKLY_SERIES_DAYS = 90;
    static final String ZONE = "America/La_Paz";
    static final String HIGH_PROBABILITY = "Sí, existe una alta probabilidad de contratación";
    static final String NO_ANSWER = "Sin respuesta";

    static final List<String> VALUATION_KEYS = List.of(
            "valoracion_formacion_1", "valoracion_formacion_2", "valoracion_formacion_3", "valoracion_formacion_4",
            "valoracion_formacion_5", "valoracion_formacion_6", "valoracion_formacion_7", "valoracion_formacion_8",
            "valoracion_formacion_9", "valoracion_formacion_10",
            "valoracion_relacion_1", "valoracion_relacion_2", "valoracion_relacion_3", "valoracion_relacion_4",
            "valoracion_relacion_5", "valoracion_relacion_6", "valoracion_relacion_7", "valoracion_relacion_8");

    /** Columnas ordenables de la tabla detallada: nombre de la pantalla → expresión SQL fija. */
    private static final Map<String, String> SORTABLE = Map.of(
            "fecha", "s.submitted_at",
            "tipo", "e.organization_type",
            "tamano", "e.organization_size",
            "departamento", "e.organization_department",
            "rubro", "e.organization_sector",
            "contrata", "e.hired_graduates_last_five_years",
            "probabilidad", "e.hiring_probability",
            "nivel", "e.demanded_training_level",
            "competencias", "e.competence_average",
            "acuerdo", "e.valuations_full_agreement");

    private static final String OBSERVED = "NOT r.not_observed AND r.numeric_value IS NOT NULL";
    private static final String COMPETENCE_JOIN =
            "JOIN competence_rating r ON r.response_id = s.id JOIN competence_catalog c ON c.id = r.competence_id";

    private final NamedParameterJdbcTemplate jdbc;

    public EmployerDashboardService(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true)
    public EmployerDashboardDto dashboard(UUID datasetId, List<String> types, List<String> sizes) {
        Filters filters = new Filters(employerDataset(datasetId), types, sizes);
        Span span = span(filters.datasetId());
        Windows windows = windows(filters, span.last());
        long filtered = windows.total().n();
        String granularity = granularity(span);

        return new EmployerDashboardDto(
                filters.datasetId(),
                span.total(),
                filtered,
                filtered < SMALL_SAMPLE,
                span.first(),
                span.last(),
                granularity,
                kpis(windows),
                timeline(filters, granularity),
                distribution(filters, "organization_type", "e.organization_type"),
                distribution(filters, "organization_size", "e.organization_size"),
                distribution(filters, "department", "e.organization_department"),
                distribution(filters, "branch", "e.branch_presence"),
                distribution(filters, "sector", "e.organization_sector"),
                distribution(filters, "demanded_level", "e.demanded_training_level"),
                distribution(filters, "channel", "e.channel"),
                distribution(filters, "hiring", "CASE WHEN e.hired_graduates_last_five_years IS NULL THEN NULL "
                        + "WHEN e.hired_graduates_last_five_years THEN 'Sí' ELSE 'No' END"),
                distribution(filters, "hiring_probability", "e.hiring_probability"),
                positions(filters, filtered),
                hiringByProbability(filters),
                valuations(filters),
                balanceByHiring(filters),
                competences(filters),
                sizeCompetence(filters));
    }

    @Transactional(readOnly = true)
    public EmployerResponsePageDto responses(UUID datasetId, List<String> types, List<String> sizes,
                                             int page, int size, String sort, String dir) {
        Filters filters = new Filters(employerDataset(datasetId), types, sizes);
        int pageSize = Math.max(10, Math.min(size, 200));
        int pageIndex = Math.max(0, page);
        String sortExpression = SORTABLE.getOrDefault(sort == null ? "" : sort, "s.submitted_at");
        String direction = "desc".equalsIgnoreCase(dir) ? "DESC" : "ASC";

        Scope scope = scope(filters, "");
        long total = jdbc.queryForObject("SELECT count(*)" + scope.from(), scope.params(), Long.class);
        MapSqlParameterSource params = new MapSqlParameterSource(scope.params().getValues())
                .addValue("limit", pageSize)
                .addValue("offset", (long) pageIndex * pageSize);
        List<EmployerResponsePageDto.Row> rows = jdbc.query(
                "SELECT s.id, s.submitted_at, e.organization_type, e.organization_size, e.organization_department, "
                        + "e.organization_sector, e.hired_graduates_last_five_years, e.hiring_probability, "
                        + "e.demanded_training_level, e.channel, "
                        + "e.competence_average, e.valuations_full_agreement"
                        + scope.from()
                        + " ORDER BY " + sortExpression + " " + direction + " NULLS LAST, s.id LIMIT :limit OFFSET :offset",
                params,
                (rs, n) -> new EmployerResponsePageDto.Row(
                        rs.getObject("id", UUID.class),
                        rs.getObject("submitted_at", OffsetDateTime.class),
                        rs.getString("organization_type"),
                        rs.getString("organization_size"),
                        rs.getString("organization_department"),
                        rs.getString("organization_sector"),
                        hiredLabel(rs.getObject("hired_graduates_last_five_years")),
                        rs.getString("hiring_probability"),
                        rs.getString("demanded_training_level"),
                        rs.getString("channel"),
                        exact(rs.getObject("competence_average")),
                        (int) rs.getShort("valuations_full_agreement")));
        return new EmployerResponsePageDto(total, pageIndex, pageSize, rows);
    }

    // ---------------------------------------------------------------- alcance y filtros

    /** Filtros de una consulta: dataset y listas de tipo y tamaño (vacías = sin filtro). */
    private record Filters(UUID datasetId, List<String> types, List<String> sizes) {
        Filters {
            types = types == null ? List.of() : List.copyOf(types);
            sizes = sizes == null ? List.of() : List.copyOf(sizes);
        }
    }

    /** Cláusula FROM/WHERE con los parámetros ya ligados. */
    private record Scope(String from, MapSqlParameterSource params) { }

    /**
     * Respuestas válidas de un dataset con los filtros aplicados. {@code extraJoin} añade uniones
     * (competencias, valoraciones, casillas) entre la tabla de respuestas y el WHERE.
     */
    private Scope scope(Filters filters, String extraJoin) {
        MapSqlParameterSource params = new MapSqlParameterSource("datasetId", filters.datasetId());
        StringBuilder from = new StringBuilder(" FROM survey_response s JOIN employer_response e ON e.response_id = s.id ")
                .append(extraJoin)
                .append(" WHERE s.dataset_id = :datasetId AND s.response_status = 'VALIDA'");
        if (!filters.types().isEmpty()) {
            from.append(" AND e.organization_type IN (:types)");
            params.addValue("types", filters.types());
        }
        if (!filters.sizes().isEmpty()) {
            from.append(" AND e.organization_size IN (:sizes)");
            params.addValue("sizes", filters.sizes());
        }
        return new Scope(from.toString(), params);
    }

    private UUID employerDataset(UUID datasetId) {
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

    // ---------------------------------------------------------------- periodos y KPI

    private record Span(long total, OffsetDateTime first, OffsetDateTime last) { }

    private Span span(UUID datasetId) {
        return jdbc.getJdbcOperations().queryForObject(
                "SELECT count(*), min(submitted_at), max(submitted_at) FROM survey_response "
                        + "WHERE dataset_id = ? AND response_status = 'VALIDA'",
                (rs, n) -> new Span(rs.getLong(1), rs.getObject(2, OffsetDateTime.class), rs.getObject(3, OffsetDateTime.class)),
                datasetId);
    }

    /** Estadísticos de una ventana temporal. */
    private record Stats(long n, long hiredAnswered, long hiredYes, long probAnswered, long probHigh,
                         long competenceN, double competenceSum) {
        static final Stats EMPTY = new Stats(0, 0, 0, 0, 0, 0, 0);

        Stats plus(Stats other) {
            return new Stats(n + other.n, hiredAnswered + other.hiredAnswered, hiredYes + other.hiredYes,
                    probAnswered + other.probAnswered, probHigh + other.probHigh,
                    competenceN + other.competenceN, competenceSum + other.competenceSum);
        }

        Double hiredShare() { return percent(hiredYes, hiredAnswered); }

        Double probShare() { return percent(probHigh, probAnswered); }

        Double competenceMean() { return competenceN == 0 ? null : competenceSum / competenceN; }
    }

    /** total del filtro; «cur» = últimos 7 días del dataset; «prev» = los 7 días anteriores. */
    private record Windows(Stats total, Stats cur, Stats prev) { }

    private Windows windows(Filters filters, OffsetDateTime last) {
        if (last == null) return new Windows(Stats.EMPTY, Stats.EMPTY, Stats.EMPTY);
        Scope scope = scope(filters, "");
        MapSqlParameterSource params = new MapSqlParameterSource(scope.params().getValues())
                .addValue("curStart", last.minusDays(7))
                .addValue("prevStart", last.minusDays(14))
                .addValue("highProbability", HIGH_PROBABILITY);
        Map<String, Stats> byWindow = new LinkedHashMap<>();
        jdbc.query("SELECT CASE WHEN s.submitted_at > :curStart THEN 'cur' WHEN s.submitted_at > :prevStart THEN 'prev' "
                        + "ELSE 'old' END AS win, count(*) AS n, count(e.hired_graduates_last_five_years) AS hired_answered, "
                        + "count(*) FILTER (WHERE e.hired_graduates_last_five_years) AS hired_yes, "
                        + "count(e.hiring_probability) AS prob_answered, "
                        + "count(*) FILTER (WHERE e.hiring_probability = :highProbability) AS prob_high, "
                        + "count(e.competence_average) AS competence_n, "
                        + "COALESCE(sum(e.competence_average), 0) AS competence_sum"
                        + scope.from() + " GROUP BY 1",
                params,
                rs -> {
                    byWindow.put(rs.getString("win"), new Stats(rs.getLong("n"), rs.getLong("hired_answered"),
                            rs.getLong("hired_yes"), rs.getLong("prob_answered"), rs.getLong("prob_high"),
                            rs.getLong("competence_n"), exact(rs.getObject("competence_sum"))));
                });
        Stats total = Stats.EMPTY;
        for (Stats stats : byWindow.values()) total = total.plus(stats);
        return new Windows(total, byWindow.getOrDefault("cur", Stats.EMPTY), byWindow.getOrDefault("prev", Stats.EMPTY));
    }

    /**
     * Cuatro indicadores. El valor es el total del filtro; la variación compara los últimos 7 días
     * con los 7 anteriores (conteos en % relativo; porcentajes y promedios en puntos).
     */
    private List<KpiDto> kpis(Windows w) {
        Stats t = w.total();
        Stats c = w.cur();
        Stats p = w.prev();
        Double countChange = p.n() >= MIN_BASE ? (c.n() - p.n()) * 100.0 / p.n() : null;
        Double hiredChange = pointChange(c.hiredShare(), p.hiredShare(), c.hiredAnswered(), p.hiredAnswered());
        Double probChange = pointChange(c.probShare(), p.probShare(), c.probAnswered(), p.probAnswered());
        Double competenceChange = pointChange(c.competenceMean(), p.competenceMean(), c.competenceN(), p.competenceN());

        return List.of(
                new KpiDto("respuestas", "Organizaciones encuestadas", (double) t.n(), "count",
                        (double) p.n(), countChange, "percent", p.n()),
                new KpiDto("contratacion", "Han contratado en los últimos 5 años", t.hiredShare(), "percent",
                        p.hiredShare(), hiredChange, "points", p.hiredAnswered()),
                new KpiDto("probabilidad", "Con alta probabilidad de contratar", t.probShare(), "percent",
                        p.probShare(), probChange, "points", p.probAnswered()),
                new KpiDto("competencias", "Competencia media percibida", t.competenceMean(), "score",
                        p.competenceMean(), competenceChange, "points", p.competenceN()));
    }

    /** Diferencia en puntos entre dos porcentajes o promedios; null si la base de alguno de los periodos es insuficiente. */
    static Double pointChange(Double current, Double previous, long currentBase, long previousBase) {
        if (current == null || previous == null || currentBase < MIN_BASE || previousBase < MIN_BASE) return null;
        return round(current - previous);
    }

    private String granularity(Span span) {
        if (span.first() == null || span.last() == null) return "day";
        return ChronoUnit.DAYS.between(span.first(), span.last()) > WEEKLY_SERIES_DAYS ? "week" : "day";
    }

    private List<TimePointDto> timeline(Filters filters, String granularity) {
        Scope scope = scope(filters, "");
        MapSqlParameterSource params = new MapSqlParameterSource(scope.params().getValues())
                .addValue("granularity", granularity)
                .addValue("zone", ZONE);
        List<TimePointDto> points = new ArrayList<>();
        long[] cumulative = {0};
        jdbc.query("SELECT date_trunc(:granularity, s.submitted_at AT TIME ZONE :zone) AS bucket, count(*) AS n"
                        + scope.from() + " AND s.submitted_at IS NOT NULL GROUP BY 1 ORDER BY 1",
                params,
                rs -> {
                    long count = rs.getLong("n");
                    cumulative[0] += count;
                    LocalDate day = rs.getTimestamp("bucket").toLocalDateTime().toLocalDate();
                    points.add(new TimePointDto(day.toString(), count, cumulative[0]));
                });
        return points;
    }

    // ---------------------------------------------------------------- distribuciones

    /** Distribución de una pregunta de opción única. Los porcentajes usan como base a quienes respondieron. */
    private DistributionDto distribution(Filters filters, String key, String expression) {
        Scope scope = scope(filters, "");
        Map<String, Long> counts = new LinkedHashMap<>();
        jdbc.query("SELECT COALESCE(" + expression + ", '" + NO_ANSWER + "') AS label, count(*) AS n"
                        + scope.from() + " GROUP BY 1",
                scope.params(),
                rs -> {
                    counts.merge(rs.getString("label"), rs.getLong("n"), Long::sum);
                });
        long missing = counts.getOrDefault(NO_ANSWER, 0L);
        long answered = counts.entrySet().stream()
                .filter(e -> !NO_ANSWER.equals(e.getKey())).mapToLong(Map.Entry::getValue).sum();
        return new DistributionDto(key, answered, missing, items(counts, answered));
    }

    private List<CountDto> items(Map<String, Long> counts, long base) {
        return counts.entrySet().stream()
                .filter(e -> e.getKey() != null && !NO_ANSWER.equals(e.getKey()))
                .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
                .map(e -> new CountDto(e.getKey(), e.getValue(), percentOf(e.getValue(), base)))
                .toList();
    }

    /** Casillas: una persona puede marcar varios cargos. El porcentaje usa como base a quienes respondieron. */
    private DistributionDto positions(Filters filters, long filtered) {
        Scope scope = scope(filters, "CROSS JOIN LATERAL unnest(string_to_array(e.positions, '; ')) AS t(label)");
        Map<String, Long> counts = new LinkedHashMap<>();
        jdbc.query("SELECT trim(t.label) AS label, count(*) AS n" + scope.from() + " GROUP BY 1",
                scope.params(),
                rs -> {
                    counts.merge(rs.getString("label"), rs.getLong("n"), Long::sum);
                });
        Scope answered = scope(filters, "");
        long answeredCount = jdbc.queryForObject("SELECT count(*)" + answered.from() + " AND e.positions IS NOT NULL",
                answered.params(), Long.class);
        return new DistributionDto("positions", answeredCount, filtered - answeredCount, items(counts, answeredCount));
    }

    private List<HiringMatrixCellDto> hiringByProbability(Filters filters) {
        Scope scope = scope(filters, "");
        List<HiringMatrixCellDto> cells = new ArrayList<>();
        jdbc.query("SELECT CASE WHEN e.hired_graduates_last_five_years IS NULL THEN '" + NO_ANSWER
                        + "' WHEN e.hired_graduates_last_five_years THEN 'Sí' ELSE 'No' END AS hired, "
                        + "COALESCE(e.hiring_probability, '" + NO_ANSWER + "') AS probability, count(*) AS n"
                        + scope.from() + " GROUP BY 1, 2",
                scope.params(),
                rs -> {
                    cells.add(new HiringMatrixCellDto(rs.getString("hired"), rs.getString("probability"), rs.getLong("n")));
                });
        return cells;
    }

    // ---------------------------------------------------------------- valoraciones

    /**
     * Conteo de una respuesta de valoración: posición de la afirmación (1..18), contratación de la organización
     * y código de la respuesta (1 de acuerdo, 2 parcial, 3 en desacuerdo, 4 no sabe; null sin respuesta).
     * Se agrega sobre el arreglo {@code employer_response.valuations}: no se lee el JSON de cada respuesta.
     */
    private record ValuationCount(int position, String hired, Integer code, long n) { }

    private static final int AGREE = 0;
    private static final int PARTLY = 1;
    private static final int DISAGREE = 2;
    private static final int NO_KNOW = 3;

    private List<ValuationCount> valuationCounts(Filters filters) {
        Scope scope = scope(filters, "CROSS JOIN LATERAL unnest(e.valuations) WITH ORDINALITY AS v(code, pos)");
        List<ValuationCount> rows = new ArrayList<>();
        jdbc.query("SELECT v.pos AS pos, e.hired_graduates_last_five_years AS hired, v.code AS code, count(*) AS n"
                        + scope.from() + " GROUP BY 1, 2, 3",
                scope.params(),
                rs -> {
                    Object code = rs.getObject("code");
                    rows.add(new ValuationCount(rs.getInt("pos"), hiredLabel(rs.getObject("hired")),
                            code == null ? null : ((Number) code).intValue(), rs.getLong("n")));
                });
        return rows;
    }

    private List<ValuationDto> valuations(Filters filters) {
        long[][] totals = new long[VALUATION_KEYS.size()][4];
        for (ValuationCount row : valuationCounts(filters)) {
            int slot = codeSlot(row.code());
            if (slot >= 0 && row.position() >= 1 && row.position() <= VALUATION_KEYS.size()) {
                totals[row.position() - 1][slot] += row.n();
            }
        }
        List<ValuationDto> result = new ArrayList<>();
        for (int i = 0; i < VALUATION_KEYS.size(); i++) {
            String key = VALUATION_KEYS.get(i);
            long[] t = totals[i];
            long scale = t[AGREE] + t[PARTLY] + t[DISAGREE];
            result.add(new ValuationDto(key, group(key), scale + t[NO_KNOW], t[AGREE], t[PARTLY], t[DISAGREE],
                    t[NO_KNOW], netIndex(t[AGREE], t[PARTLY], t[DISAGREE])));
        }
        return result;
    }

    /** Índice neto por grupo de afirmaciones (formación / relación) y por contratación de la organización. */
    private List<GroupBalanceDto> balanceByHiring(Filters filters) {
        Map<String, long[]> byGroup = new LinkedHashMap<>();
        for (ValuationCount row : valuationCounts(filters)) {
            int slot = codeSlot(row.code());
            if (slot < 0 || slot == NO_KNOW || row.position() < 1 || row.position() > VALUATION_KEYS.size()) continue;
            String group = group(VALUATION_KEYS.get(row.position() - 1));
            long[] totals = byGroup.computeIfAbsent(group + "|" + row.hired(), k -> new long[3]);
            totals[slot] += row.n();
        }
        List<GroupBalanceDto> result = new ArrayList<>();
        for (Map.Entry<String, long[]> entry : byGroup.entrySet()) {
            String[] parts = entry.getKey().split("\\|", 2);
            long[] t = entry.getValue();
            result.add(new GroupBalanceDto(parts[0], parts[1], t[AGREE] + t[PARTLY] + t[DISAGREE],
                    netIndex(t[AGREE], t[PARTLY], t[DISAGREE])));
        }
        return result;
    }

    private static String group(String key) {
        return key.contains("formacion") ? "formacion" : "relacion";
    }

    /** Código de respuesta (1..4) a su posición en la escala: 0 de acuerdo, 1 parcial, 2 en desacuerdo, 3 no sabe. */
    private static int codeSlot(Integer code) {
        return code == null || code < 1 || code > 4 ? -1 : code - 1;
    }

    /** (de acuerdo − en desacuerdo) / respuestas de la escala × 100, de -100 a 100. «No sabe» no entra. */
    static Double netIndex(long agree, long partly, long disagree) {
        long base = agree + partly + disagree;
        return base == 0 ? null : round((agree - disagree) * 100.0 / base);
    }

    private static String hiredLabel(Object hired) {
        if (hired == null) return NO_ANSWER;
        return Boolean.TRUE.equals(hired) ? "Sí" : "No";
    }

    // ---------------------------------------------------------------- competencias

    private List<CompetenceDto> competences(Filters filters) {
        Scope scope = scope(filters, COMPETENCE_JOIN);
        List<CompetenceDto> result = new ArrayList<>();
        jdbc.query("SELECT c.code, c.name, c.competence_group, "
                        + "count(*) FILTER (WHERE " + OBSERVED + ") AS answered, "
                        + "count(*) FILTER (WHERE r.not_observed) AS not_observed, "
                        + "avg(r.numeric_value) FILTER (WHERE " + OBSERVED + ") AS average, "
                        + "stddev_samp(r.numeric_value) FILTER (WHERE " + OBSERVED + ") AS deviation, "
                        + "percentile_cont(0.5) WITHIN GROUP (ORDER BY r.numeric_value) FILTER (WHERE " + OBSERVED + ") AS median, "
                        + "count(*) FILTER (WHERE r.numeric_value = 1) AS l1, count(*) FILTER (WHERE r.numeric_value = 2) AS l2, "
                        + "count(*) FILTER (WHERE r.numeric_value = 3) AS l3, count(*) FILTER (WHERE r.numeric_value = 4) AS l4, "
                        + "count(*) FILTER (WHERE r.numeric_value = 5) AS l5"
                        + scope.from() + " GROUP BY c.id, c.code, c.name, c.competence_group, c.display_order "
                        + "ORDER BY c.competence_group, c.display_order",
                scope.params(),
                rs -> {
                    long answered = rs.getLong("answered");
                    Map<Integer, Long> levels = new LinkedHashMap<>();
                    for (int level = 1; level <= 5; level++) levels.put(level, rs.getLong("l" + level));
                    double lowShare = answered == 0 ? 0 : (levels.get(1) + levels.get(2)) * 100.0 / answered;
                    result.add(new CompetenceDto(rs.getString("code"), rs.getString("name"), rs.getString("competence_group"),
                            answered, rs.getLong("not_observed"), exact(rs.getObject("average")),
                            exact(rs.getObject("deviation")), exact(rs.getObject("median")), levels, round(lowShare)));
                });
        return result;
    }

    private List<SizeCompetenceDto> sizeCompetence(Filters filters) {
        Scope scope = scope(filters, COMPETENCE_JOIN);
        List<SizeCompetenceDto> cells = new ArrayList<>();
        jdbc.query("SELECT COALESCE(e.organization_size, '" + NO_ANSWER + "') AS size, c.code, c.name, "
                        + "count(*) FILTER (WHERE " + OBSERVED + ") AS answered, "
                        + "avg(r.numeric_value) FILTER (WHERE " + OBSERVED + ") AS average"
                        + scope.from() + " GROUP BY e.organization_size, c.id, c.code, c.name, c.display_order",
                scope.params(),
                rs -> {
                    cells.add(new SizeCompetenceDto(rs.getString("size"), rs.getString("code"), rs.getString("name"),
                            rs.getLong("answered"), exact(rs.getObject("average"))));
                });
        return cells;
    }

    // ---------------------------------------------------------------- cruces

    /** Variables cruzables de empleadores: todas de opción única o escala, con su columna tipada. */
    static final Map<String, String> CROSS_FIELDS = Map.of(
            "tipo_organizacion", "e.organization_type",
            "tamano_organizacion", "e.organization_size",
            "rubro_organizacion", "e.organization_sector",
            "departamento_organizacion", "e.organization_department",
            "presencia_sedes", "e.branch_presence",
            "contrato_titulados_ultimos_5_anios", "CASE WHEN e.hired_graduates_last_five_years IS NULL THEN NULL WHEN e.hired_graduates_last_five_years THEN 'Sí' ELSE 'No' END",
            "posibilidad_incorporacion", "e.hiring_probability",
            "nivel_formacion_demandado", "e.demanded_training_level",
            "medio_convocatoria", "e.channel");

    /**
     * Tabla de contingencia de dos variables, con el porcentaje por fila. Solo cuentan las respuestas que
     * tienen ambas variables, como en el cruce anterior.
     */
    @Transactional(readOnly = true)
    public CrossTabulationDto cross(UUID datasetId, String rowField, String columnField,
                                    List<String> types, List<String> sizes) {
        String rowExpression = CROSS_FIELDS.get(rowField);
        String columnExpression = CROSS_FIELDS.get(columnField);
        if (rowExpression == null || columnExpression == null) {
            throw new IllegalArgumentException("Variable no disponible para empleadores: " + rowField + " / " + columnField);
        }
        Filters filters = new Filters(employerDataset(datasetId), types, sizes);
        Scope scope = scope(filters, "");
        Map<String, Map<String, Long>> counts = new LinkedHashMap<>();
        jdbc.query("SELECT " + rowExpression + " AS row_label, " + columnExpression + " AS column_label, count(*) AS n"
                        + scope.from() + " AND " + rowExpression + " IS NOT NULL AND " + columnExpression + " IS NOT NULL"
                        + " GROUP BY 1, 2",
                scope.params(),
                rs -> {
                    counts.computeIfAbsent(rs.getString("row_label"), k -> new LinkedHashMap<>())
                            .merge(rs.getString("column_label"), rs.getLong("n"), Long::sum);
                });
        List<String> rowCategories = counts.keySet().stream().sorted().toList();
        List<String> columnCategories = counts.values().stream().flatMap(m -> m.keySet().stream()).distinct().sorted().toList();
        Map<String, Map<String, Long>> filled = new LinkedHashMap<>();
        Map<String, Map<String, Double>> percentages = new LinkedHashMap<>();
        long total = 0;
        for (String row : rowCategories) {
            Map<String, Long> rowCounts = new LinkedHashMap<>();
            Map<String, Double> rowPercentages = new LinkedHashMap<>();
            long rowTotal = counts.get(row).values().stream().mapToLong(Long::longValue).sum();
            total += rowTotal;
            for (String column : columnCategories) {
                long count = counts.get(row).getOrDefault(column, 0L);
                rowCounts.put(column, count);
                rowPercentages.put(column, rowTotal == 0 ? 0 : round(count * 100.0 / rowTotal));
            }
            filled.put(row, rowCounts);
            percentages.put(row, rowPercentages);
        }
        return new CrossTabulationDto(filters.datasetId(), rowField, columnField, total, rowCategories, columnCategories,
                filled, percentages, total < SMALL_SAMPLE);
    }

    // ---------------------------------------------------------------- utilidades

    /** Número sin redondear (para sumas y promedios intermedios). */
    static Double exact(Object value) {
        if (value == null) return null;
        if (value instanceof BigDecimal decimal) return decimal.doubleValue();
        if (value instanceof Number number) return number.doubleValue();
        return null;
    }

    static Double percent(long part, long base) {
        return base == 0 ? null : round(part * 100.0 / base);
    }

    private static double percentOf(long part, long base) {
        return base == 0 ? 0 : round(part * 100.0 / base);
    }

    static double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
