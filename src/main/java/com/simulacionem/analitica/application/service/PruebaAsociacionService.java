package com.simulacionem.analitica.application.service;

import com.simulacionem.analitica.application.service.EmployerVariableCatalog.Level;
import org.apache.commons.math3.distribution.ChiSquaredDistribution;
import org.apache.commons.math3.distribution.NormalDistribution;
import org.apache.commons.math3.distribution.TDistribution;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

/**
 * Elige la prueba de asociación según el <b>nivel de medición</b> de las dos variables y el tamaño de muestra.
 *
 * <ul>
 *   <li>Nominal × nominal: se delega en {@link SeleccionPruebaEstadisticaService} (χ² si se cumple Cochran,
 *       Fisher exacta en 2×2, Fisher-Freeman-Halton por Monte Carlo en r×c). Efecto: V de Cramér.</li>
 *   <li>Ordinal × ordinal: ρ de Spearman con rangos medios para empates. Efecto: el propio ρ.</li>
 *   <li>Nominal de 2 grupos × ordinal: U de Mann–Whitney. Efecto: correlación biserial de rangos.</li>
 *   <li>Nominal de 3 o más grupos × ordinal: H de Kruskal–Wallis. Efecto: ε².</li>
 * </ul>
 * Con muestras chicas el p-valor se obtiene por permutación ({@value #PERMUTACIONES} réplicas, semilla fija),
 * que no depende de aproximaciones asintóticas. Todo se calcula a partir de la tabla de contingencia ordenada.
 */
@Service
public class PruebaAsociacionService {

    static final int PERMUTACIONES = 10_000;
    /** Por debajo de este n, Spearman usa permutación en vez de la aproximación t. */
    static final int N_ASINTOTICO_SPEARMAN = AnalysisRules.MINIMUM_ASSOCIATION_SAMPLE;
    /** Por debajo de este tamaño de grupo, Mann–Whitney usa permutación. */
    static final int N_GRUPO_MANN_WHITNEY = AnalysisRules.MINIMUM_GROUP_FOR_ASYMPTOTIC_MANN_WHITNEY;
    /** Por debajo de este tamaño de grupo, Kruskal–Wallis usa permutación. */
    static final int N_GRUPO_KRUSKAL = AnalysisRules.MINIMUM_GROUP_FOR_ASYMPTOTIC_KRUSKAL;
    /** La permutación recorre todas las observaciones en cada réplica: por encima de este n se usa la aproximación. */
    static final int N_MAXIMO_PERMUTACION = AnalysisRules.MAXIMUM_PERMUTATION_SAMPLE;
    private static final long SEMILLA = 20_260_101L;
    private static final NormalDistribution NORMAL = new NormalDistribution(null, 0, 1);

    private final SeleccionPruebaEstadisticaService nominal;

    public PruebaAsociacionService(SeleccionPruebaEstadisticaService nominal) {
        this.nominal = nominal;
    }

    /**
     * @param tabla   frecuencias con filas y columnas en el orden de sus categorías (el de la escala si es ordinal)
     * @param fila    nivel de medición de la variable de filas
     * @param columna nivel de medición de la variable de columnas
     */
    public ResultadoAsociacion analizar(long[][] tabla, Level fila, Level columna, double alfa) {
        long[][] t = sinMarginalesVacias(tabla);
        int filas = t.length;
        int columnas = filas == 0 ? 0 : t[0].length;
        long n = total(t);
        String nivelFila = nombreNivel(fila);
        String nivelColumna = nombreNivel(columna);

        if (filas < 2 || columnas < 2) {
            return ResultadoAsociacion.noAplicable(nivelFila, nivelColumna, n, alfa,
                    "La tabla necesita al menos 2 categorías con datos en filas y en columnas.");
        }
        if (n < SeleccionPruebaEstadisticaService.MUESTRA_MINIMA) {
            return ResultadoAsociacion.noAplicable(nivelFila, nivelColumna, n, alfa,
                    "Con n = " + n + " (< " + SeleccionPruebaEstadisticaService.MUESTRA_MINIMA
                            + ") no hay potencia para contrastar la asociación. Se muestran solo los conteos.");
        }
        boolean filaOrdinal = fila == Level.ORDINAL;
        boolean columnaOrdinal = columna == Level.ORDINAL;
        if (!filaOrdinal && !columnaOrdinal) return nominalPorNominal(t, nivelFila, nivelColumna, alfa);
        if (filaOrdinal && columnaOrdinal) return spearman(t, nivelFila, nivelColumna, alfa);
        // Una nominal y una ordinal: los grupos son las categorías de la nominal.
        long[][] grupos = filaOrdinal ? transponer(t) : t;
        return grupos.length == 2
                ? mannWhitney(grupos, nivelFila, nivelColumna, alfa)
                : kruskalWallis(grupos, nivelFila, nivelColumna, alfa);
    }

    // ---------------------------------------------------------------- nominal × nominal

    private ResultadoAsociacion nominalPorNominal(long[][] t, String nivelFila, String nivelColumna, double alfa) {
        SeleccionPruebaEstadisticaService.ResultadoPrueba r = nominal.seleccionar(t, alfa);
        int dfMenor = Math.min(t.length, t[0].length) - 1;
        boolean dosPorDos = t.length == 2 && t[0].length == 2;
        String metodo = switch (r.codigo()) {
            case "FISHER_EXACTA" -> "Exacto (hipergeométrica)";
            case "FISHER_FREEMAN_HALTON" -> "Monte Carlo (" + formatear(r.simulaciones()) + " tablas simuladas)";
            case "CHI_CUADRADO" -> "Asintótico (χ²)";
            default -> null;
        };
        List<String> descartadas = new ArrayList<>();
        descartadas.add("Spearman, Mann–Whitney y Kruskal–Wallis: necesitan al menos una variable con orden; aquí ambas son nominales.");
        if (!"CHI_CUADRADO".equals(r.codigo()) && r.aplicable()) {
            descartadas.add("χ² de Pearson: no se cumple la regla de Cochran (frecuencias esperadas chicas), su p-valor no sería fiable.");
        }
        return new ResultadoAsociacion(r.codigo(), r.nombrePrueba(), r.aplicable(), nivelFila, nivelColumna,
                r.motivo(), descartadas, r.n(),
                "CHI_CUADRADO".equals(r.codigo()) ? "χ²" : null, r.estadistico(), r.gradosLibertad(),
                r.pValor(), metodo, alfa, r.rechazaHipotesis(),
                dosPorDos ? "φ (phi)" : "V de Cramér", r.vCramer(), magnitudCramer(r.vCramer(), dfMenor),
                r.celdasEsperadasMenores5(), r.totalCeldas(), r.esperadaMinima());
    }

    // ---------------------------------------------------------------- ordinal × ordinal

    private ResultadoAsociacion spearman(long[][] t, String nivelFila, String nivelColumna, double alfa) {
        long n = total(t);
        double rho = rhoDeTabla(t);
        Double p;
        String metodo;
        if (n < N_ASINTOTICO_SPEARMAN) {
            p = permutacionSpearman(t, rho);
            metodo = "Monte Carlo (" + formatear(PERMUTACIONES) + " permutaciones)";
        } else {
            p = pSpearmanT(rho, n);
            metodo = "Asintótico (t de Student, n − 2 gl)";
        }
        String motivo = "Ambas variables son ordinales: Spearman compara el orden de las respuestas y usa rangos medios para los empates."
                + (n < N_ASINTOTICO_SPEARMAN ? " Con n = " + n + " (< " + N_ASINTOTICO_SPEARMAN + ") el p-valor se obtiene por permutación." : "");
        List<String> descartadas = List.of(
                "χ² de Pearson: trata las categorías como nominales y descarta el orden de la escala.",
                "r de Pearson: supone distancias iguales entre categorías y normalidad, algo que una escala ordinal no garantiza.");
        return new ResultadoAsociacion("SPEARMAN", "ρ de Spearman", true, nivelFila, nivelColumna, motivo, descartadas,
                n, "ρ", redondear(rho, 4), null, redondear(p, 6), metodo, alfa, p < alfa,
                "ρ de Spearman", redondear(rho, 4), magnitudCorrelacion(rho), null, null, null);
    }

    /** ρ de Spearman: correlación de Pearson entre los rangos medios de filas y columnas, ponderada por las frecuencias. */
    static double rhoDeTabla(long[][] t) {
        double[] rf = rangosMedios(totalesFila(t));
        double[] rc = rangosMedios(totalesColumna(t));
        long n = total(t);
        double mediaF = 0, mediaC = 0;
        for (int i = 0; i < t.length; i++) for (int j = 0; j < t[0].length; j++) {
            mediaF += t[i][j] * rf[i];
            mediaC += t[i][j] * rc[j];
        }
        mediaF /= n;
        mediaC /= n;
        double cov = 0, varF = 0, varC = 0;
        for (int i = 0; i < t.length; i++) for (int j = 0; j < t[0].length; j++) {
            double df = rf[i] - mediaF, dc = rc[j] - mediaC;
            cov += t[i][j] * df * dc;
            varF += t[i][j] * df * df;
            varC += t[i][j] * dc * dc;
        }
        return varF == 0 || varC == 0 ? 0 : cov / Math.sqrt(varF * varC);
    }

    static double pSpearmanT(double rho, long n) {
        if (Math.abs(rho) >= 1.0) return 0.0;
        double tStat = rho * Math.sqrt((n - 2) / (1 - rho * rho));
        return 2 * (1 - new TDistribution(null, n - 2).cumulativeProbability(Math.abs(tStat)));
    }

    private static double permutacionSpearman(long[][] t, double observado) {
        int[][] pares = pares(t);
        int[] filas = pares[0];
        int[] columnas = pares[1];
        int r = t.length, c = t[0].length;
        Random aleatorio = new Random(SEMILLA);
        int extremos = 0;
        long[][] simulada = new long[r][c];
        for (int s = 0; s < PERMUTACIONES; s++) {
            barajar(columnas, aleatorio);
            for (long[] fila : simulada) java.util.Arrays.fill(fila, 0L);
            for (int k = 0; k < filas.length; k++) simulada[filas[k]][columnas[k]]++;
            if (Math.abs(rhoDeTabla(simulada)) >= Math.abs(observado) - 1e-12) extremos++;
        }
        return (extremos + 1.0) / (PERMUTACIONES + 1.0);
    }

    // ---------------------------------------------------------------- nominal (2 grupos) × ordinal

    private ResultadoAsociacion mannWhitney(long[][] g, String nivelFila, String nivelColumna, double alfa) {
        long n1 = sum(g[0]), n2 = sum(g[1]);
        long n = n1 + n2;
        double u1 = uMannWhitney(g);
        double rankBiserial = 2.0 * u1 / ((double) n1 * n2) - 1.0;
        Double p;
        String metodo;
        boolean grupoChico = Math.min(n1, n2) < N_GRUPO_MANN_WHITNEY;
        if (grupoChico && n <= N_MAXIMO_PERMUTACION) {
            p = permutacionGrupos(g, true);
            metodo = "Monte Carlo (" + formatear(PERMUTACIONES) + " permutaciones)";
        } else {
            p = pMannWhitneyNormal(g, u1);
            metodo = "Aproximación normal con corrección por empates";
        }
        String motivo = "Una variable nominal de 2 grupos y una ordinal: Mann–Whitney compara si las respuestas de un grupo tienden"
                + " a ser más altas que las del otro, sin suponer distancias iguales ni normalidad."
                + (grupoChico && n <= N_MAXIMO_PERMUTACION ? " Hay un grupo con menos de " + N_GRUPO_MANN_WHITNEY
                + " respuestas: el p-valor se obtiene por permutación." : "");
        List<String> descartadas = List.of(
                "t de Student: supone una variable de intervalo con distribución normal; una escala ordinal no lo cumple.",
                "χ² de Pearson: compara frecuencias pero descarta el orden de la escala.");
        return new ResultadoAsociacion("MANN_WHITNEY", "U de Mann–Whitney", true, nivelFila, nivelColumna, motivo, descartadas,
                n, "U", redondear(u1, 2), null, redondear(p, 6), metodo, alfa, p < alfa,
                "Correlación biserial de rangos", redondear(rankBiserial, 4), magnitudCorrelacion(rankBiserial),
                null, null, null);
    }

    /** U del primer grupo con rangos medios de la variable ordinal combinada. */
    static double uMannWhitney(long[][] g) {
        double[] rangos = rangosMedios(totalesColumna(g));
        double r1 = 0;
        for (int j = 0; j < g[0].length; j++) r1 += g[0][j] * rangos[j];
        long n1 = sum(g[0]);
        return r1 - n1 * (n1 + 1) / 2.0;
    }

    static double pMannWhitneyNormal(long[][] g, double u1) {
        long n1 = sum(g[0]), n2 = sum(g[1]);
        long n = n1 + n2;
        double empates = 0;
        for (long tj : totalesColumna(g)) empates += (double) tj * tj * tj - tj;
        double varianza = n1 * (double) n2 / 12.0 * ((n + 1) - empates / ((double) n * (n - 1)));
        if (varianza <= 0) return 1.0;
        double media = n1 * (double) n2 / 2.0;
        double diferencia = Math.abs(u1 - media) - 0.5;
        double z = Math.max(0, diferencia) / Math.sqrt(varianza);
        return Math.min(1.0, 2 * (1 - NORMAL.cumulativeProbability(z)));
    }

    // ---------------------------------------------------------------- nominal (3+ grupos) × ordinal

    private ResultadoAsociacion kruskalWallis(long[][] g, String nivelFila, String nivelColumna, double alfa) {
        long n = total(g);
        int k = g.length;
        double h = hKruskalWallis(g);
        double epsilon2 = n > 1 ? h / (n - 1) : 0;
        long grupoMenor = Long.MAX_VALUE;
        for (long[] grupo : g) grupoMenor = Math.min(grupoMenor, sum(grupo));
        Double p;
        String metodo;
        boolean grupoChico = grupoMenor < N_GRUPO_KRUSKAL;
        if (grupoChico && n <= N_MAXIMO_PERMUTACION) {
            p = permutacionGrupos(g, false);
            metodo = "Monte Carlo (" + formatear(PERMUTACIONES) + " permutaciones)";
        } else {
            p = 1 - new ChiSquaredDistribution(null, k - 1).cumulativeProbability(h);
            metodo = "Asintótico (χ² con " + (k - 1) + " gl)";
        }
        String motivo = "Una variable nominal de " + k + " grupos y una ordinal: Kruskal–Wallis compara si algún grupo tiende a"
                + " responder más alto que otro, usando rangos (con corrección por empates)."
                + (grupoChico && n <= N_MAXIMO_PERMUTACION ? " Hay grupos con menos de " + N_GRUPO_KRUSKAL
                + " respuestas: el p-valor se obtiene por permutación." : "");
        List<String> descartadas = List.of(
                "ANOVA de un factor: supone una variable de intervalo, normalidad y varianzas iguales; una escala ordinal no lo cumple.",
                "χ² de Pearson: compara frecuencias pero descarta el orden de la escala.");
        return new ResultadoAsociacion("KRUSKAL_WALLIS", "H de Kruskal–Wallis", true, nivelFila, nivelColumna, motivo, descartadas,
                n, "H", redondear(h, 4), k - 1, redondear(p, 6), metodo, alfa, p < alfa,
                "ε² (épsilon cuadrado)", redondear(epsilon2, 4), magnitudEpsilon(epsilon2), null, null, null);
    }

    /** H de Kruskal–Wallis con corrección por empates; grupos en filas, categorías ordinales en columnas. */
    static double hKruskalWallis(long[][] g) {
        long[] totalesCol = totalesColumna(g);
        double[] rangos = rangosMedios(totalesCol);
        long n = total(g);
        double suma = 0;
        for (long[] grupo : g) {
            long ng = sum(grupo);
            if (ng == 0) continue;
            double r = 0;
            for (int j = 0; j < grupo.length; j++) r += grupo[j] * rangos[j];
            suma += r * r / ng;
        }
        double h = 12.0 / (n * (n + 1.0)) * suma - 3.0 * (n + 1);
        double empates = 0;
        for (long tj : totalesCol) empates += (double) tj * tj * tj - tj;
        double correccion = 1 - empates / ((double) n * n * n - n);
        return correccion <= 0 ? 0 : h / correccion;
    }

    /** Permutación de etiquetas de grupo: Mann–Whitney (|U − n1·n2/2|) o Kruskal–Wallis (H). */
    private static double permutacionGrupos(long[][] g, boolean mannWhitney) {
        int[][] pares = pares(g);
        int[] grupos = pares[0];
        int[] valores = pares[1];
        Random aleatorio = new Random(SEMILLA);
        long n1 = sum(g[0]), n2 = g.length > 1 ? sum(g[1]) : 0;
        double centro = n1 * (double) n2 / 2.0;
        double observado = mannWhitney ? Math.abs(uMannWhitney(g) - centro) : hKruskalWallis(g);
        int extremos = 0;
        long[][] simulada = new long[g.length][g[0].length];
        for (int s = 0; s < PERMUTACIONES; s++) {
            barajar(grupos, aleatorio);
            for (long[] fila : simulada) java.util.Arrays.fill(fila, 0L);
            for (int k = 0; k < grupos.length; k++) simulada[grupos[k]][valores[k]]++;
            double estadistico = mannWhitney ? Math.abs(uMannWhitney(simulada) - centro) : hKruskalWallis(simulada);
            if (estadistico >= observado - 1e-9) extremos++;
        }
        return (extremos + 1.0) / (PERMUTACIONES + 1.0);
    }

    // ---------------------------------------------------------------- tamaño del efecto

    /** Umbrales de Cohen para correlaciones (|ρ| y biserial de rangos). */
    static String magnitudCorrelacion(double valor) {
        double a = Math.abs(valor);
        if (a < 0.1) return "Despreciable";
        if (a < 0.3) return "Pequeña";
        if (a < 0.5) return "Moderada";
        return "Grande";
    }

    /** Umbrales de Cohen para V de Cramér, ajustados por min(filas, columnas) − 1. */
    static String magnitudCramer(Double v, int dfMenor) {
        if (v == null) return null;
        double raiz = Math.sqrt(Math.max(1, dfMenor));
        if (v < 0.1 / raiz) return "Despreciable";
        if (v < 0.3 / raiz) return "Pequeña";
        if (v < 0.5 / raiz) return "Moderada";
        return "Grande";
    }

    /** Umbrales de ε² (Tomczak y Tomczak, 2014). */
    static String magnitudEpsilon(double e) {
        if (e < 0.01) return "Despreciable";
        if (e < 0.08) return "Pequeña";
        if (e < 0.26) return "Moderada";
        return "Grande";
    }

    // ---------------------------------------------------------------- utilidades

    /** Rango medio de cada categoría a partir de sus frecuencias (los empates comparten el promedio de sus rangos). */
    static double[] rangosMedios(long[] frecuencias) {
        double[] rangos = new double[frecuencias.length];
        long acumulado = 0;
        for (int i = 0; i < frecuencias.length; i++) {
            rangos[i] = acumulado + (frecuencias[i] + 1) / 2.0;
            acumulado += frecuencias[i];
        }
        return rangos;
    }

    /** Expande la tabla en pares (índice de fila, índice de columna), uno por observación. */
    private static int[][] pares(long[][] t) {
        int n = (int) total(t);
        int[] filas = new int[n];
        int[] columnas = new int[n];
        int k = 0;
        for (int i = 0; i < t.length; i++) for (int j = 0; j < t[0].length; j++) for (long c = 0; c < t[i][j]; c++) {
            filas[k] = i;
            columnas[k] = j;
            k++;
        }
        return new int[][]{filas, columnas};
    }

    private static void barajar(int[] valores, Random aleatorio) {
        for (int i = valores.length - 1; i > 0; i--) {
            int j = aleatorio.nextInt(i + 1);
            int temporal = valores[i];
            valores[i] = valores[j];
            valores[j] = temporal;
        }
    }

    private static long[][] transponer(long[][] t) {
        long[][] r = new long[t[0].length][t.length];
        for (int i = 0; i < t.length; i++) for (int j = 0; j < t[0].length; j++) r[j][i] = t[i][j];
        return r;
    }

    /** Quita filas y columnas vacías conservando el orden de las categorías. */
    static long[][] sinMarginalesVacias(long[][] t) {
        if (t == null || t.length == 0 || t[0].length == 0) return new long[0][0];
        List<Integer> columnas = new ArrayList<>();
        for (int j = 0; j < t[0].length; j++) {
            long s = 0;
            for (long[] fila : t) s += fila[j];
            if (s > 0) columnas.add(j);
        }
        List<long[]> filas = new ArrayList<>();
        for (long[] fila : t) {
            long[] reducida = columnas.stream().mapToLong(j -> fila[j]).toArray();
            if (sum(reducida) > 0) filas.add(reducida);
        }
        return filas.toArray(long[][]::new);
    }

    private static long[] totalesFila(long[][] t) {
        long[] r = new long[t.length];
        for (int i = 0; i < t.length; i++) r[i] = sum(t[i]);
        return r;
    }

    private static long[] totalesColumna(long[][] t) {
        long[] r = new long[t[0].length];
        for (long[] fila : t) for (int j = 0; j < fila.length; j++) r[j] += fila[j];
        return r;
    }

    private static long sum(long[] values) {
        long s = 0;
        for (long v : values) s += v;
        return s;
    }

    private static long total(long[][] t) {
        long s = 0;
        for (long[] fila : t) s += sum(fila);
        return s;
    }

    private static String nombreNivel(Level level) {
        return switch (level) {
            case NOMINAL -> "Nominal";
            case BINARIA -> "Nominal (2 categorías)";
            case ORDINAL -> "Ordinal";
            case MULTIPLE -> "Respuesta múltiple";
        };
    }

    private static String formatear(Integer value) {
        return value == null ? "" : String.format(java.util.Locale.ROOT, "%,d", value).replace(',', ' ');
    }

    private static double redondear(double valor, int decimales) {
        return DescriptiveStatistics.round(valor, decimales);
    }

    /**
     * Resultado de la prueba elegida, con el motivo de la elección y las alternativas descartadas.
     *
     * @param metodoP       cómo se obtuvo el p-valor: asintótico, exacto o Monte Carlo
     * @param efectoNombre  medida del tamaño del efecto (V de Cramér, ρ, biserial de rangos, ε²)
     * @param magnitud      Despreciable, Pequeña, Moderada o Grande, según umbrales convencionales
     */
    public record ResultadoAsociacion(
            String codigo, String nombrePrueba, boolean aplicable,
            String nivelFila, String nivelColumna,
            String motivo, List<String> descartadas,
            long n, String estadisticoNombre, Double estadistico, Integer gradosLibertad,
            Double pValor, String metodoP, double alfa, boolean significativo,
            String efectoNombre, Double efecto, String magnitud,
            Integer celdasEsperadasMenores5, Integer totalCeldas, Double esperadaMinima) {

        static ResultadoAsociacion noAplicable(String nivelFila, String nivelColumna, long n, double alfa, String motivo) {
            return new ResultadoAsociacion("NO_APLICABLE", "No aplicable", false, nivelFila, nivelColumna, motivo, List.of(),
                    n, null, null, null, null, null, alfa, false, null, null, null, null, null, null);
        }
    }
}
