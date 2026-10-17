package com.simulacionem.analitica.application.service;

import org.apache.commons.math3.distribution.ChiSquaredDistribution;
import org.apache.commons.math3.special.Gamma;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

/**
 * Elige y ejecuta la prueba de asociación adecuada para una tabla de contingencia de dos variables
 * categóricas, según el tamaño de muestra y las frecuencias esperadas (regla de Cochran):
 * <ul>
 *   <li>n &lt; 10, menos de 2 filas/columnas o variable de respuesta múltiple → no aplicable.</li>
 *   <li>2×2 con alguna esperada &lt; 5 → Fisher exacta (hipergeométrica, bilateral).</li>
 *   <li>r×c con alguna esperada &lt; 1 o más del 20 % de celdas con esperada &lt; 5 →
 *       Fisher-Freeman-Halton con p-valor Monte Carlo (semilla fija, reproducible).</li>
 *   <li>En otro caso → χ² de Pearson.</li>
 * </ul>
 * El tamaño del efecto se informa con la V de Cramér (φ en tablas 2×2).
 */
@Service
public class SeleccionPruebaEstadisticaService {

    public static final int MUESTRA_MINIMA = 10;
    static final int SIMULACIONES_MONTE_CARLO = 10_000;
    private static final long SEMILLA = 20_260_101L;

    public ResultadoPrueba seleccionar(long[][] frecuencias, double alfa) {
        return seleccionar(frecuencias, alfa, false);
    }

    public ResultadoPrueba seleccionar(long[][] frecuencias, double alfa, boolean respuestaMultiple) {
        long[][] tabla = sinMarginalesVacias(frecuencias);
        int filas = tabla.length;
        int columnas = filas == 0 ? 0 : tabla[0].length;
        long n = total(tabla);
        int totalCeldas = filas * columnas;

        if (respuestaMultiple) {
            return noAplicable(alfa, n, totalCeldas, "Una de las variables es de respuesta múltiple: las categorías no son "
                    + "excluyentes y una misma persona aparece en varias celdas, así que no se cumple el supuesto de "
                    + "independencia de las observaciones. Se muestran solo los conteos.");
        }
        if (filas < 2 || columnas < 2) {
            return noAplicable(alfa, n, totalCeldas, "La tabla necesita al menos 2 categorías con datos en filas y en columnas.");
        }
        if (n < MUESTRA_MINIMA) {
            return noAplicable(alfa, n, totalCeldas, "Con n = " + n + " (< " + MUESTRA_MINIMA
                    + ") no hay potencia para contrastar la asociación. Se muestran los conteos.");
        }

        double[][] esperadas = esperadas(tabla, n);
        double esperadaMinima = Double.MAX_VALUE;
        int celdasMenores5 = 0;
        for (double[] fila : esperadas) {
            for (double valor : fila) {
                esperadaMinima = Math.min(esperadaMinima, valor);
                if (valor < 5.0) celdasMenores5++;
            }
        }
        double chiCuadrado = chiCuadrado(tabla, esperadas);
        int gradosLibertad = (filas - 1) * (columnas - 1);
        double vCramer = redondear(Math.sqrt(chiCuadrado / (n * (double) (Math.min(filas, columnas) - 1))), 4);
        Contexto contexto = new Contexto(n, celdasMenores5, totalCeldas, redondear(esperadaMinima, 2), vCramer);

        if (filas == 2 && columnas == 2 && celdasMenores5 > 0) {
            double p = fisherExacta2x2(tabla);
            return resultado("FISHER_EXACTA", "Fisher exacta", null, null, p, alfa, contexto, null,
                    "Tabla 2×2 con " + celdasMenores5 + " celda(s) con frecuencia esperada < 5: la aproximación χ² "
                            + "no es fiable y se calcula la probabilidad exacta (hipergeométrica).");
        }
        boolean cumpleCochran = esperadaMinima >= 1.0 && celdasMenores5 <= 0.2 * totalCeldas;
        if (!cumpleCochran) {
            double p = fisherFreemanHaltonMonteCarlo(tabla);
            return resultado("FISHER_FREEMAN_HALTON", "Fisher-Freeman-Halton (Monte Carlo)", null, null, p, alfa,
                    contexto, SIMULACIONES_MONTE_CARLO,
                    celdasMenores5 + " de " + totalCeldas + " celdas tienen frecuencia esperada < 5"
                            + (esperadaMinima < 1.0 ? " y al menos una < 1" : "")
                            + ": no se cumple la regla de Cochran para χ². Se usa la extensión r×c de Fisher con "
                            + SIMULACIONES_MONTE_CARLO + " tablas simuladas.");
        }
        double p = new ChiSquaredDistribution(null, gradosLibertad).cumulativeProbability(chiCuadrado);
        return resultado("CHI_CUADRADO", "Chi-cuadrado de Pearson", redondear(chiCuadrado, 4), gradosLibertad,
                1.0 - p, alfa, contexto, null,
                "Todas las frecuencias esperadas son ≥ 1 y como máximo el 20 % son < 5 (regla de Cochran): "
                        + "la aproximación χ² es válida.");
    }

    // ---------------------------------------------------------------------------------------------------------

    /** Fisher bilateral: suma las probabilidades de todas las tablas con margen fijo tan o menos probables. */
    static double fisherExacta2x2(long[][] tabla) {
        long a = tabla[0][0];
        long fila1 = tabla[0][0] + tabla[0][1];
        long columna1 = tabla[0][0] + tabla[1][0];
        long n = total(tabla);
        long min = Math.max(0, fila1 + columna1 - n);
        long max = Math.min(fila1, columna1);
        double logObservada = logHipergeometrica(a, fila1, columna1, n);
        double p = 0.0;
        for (long x = min; x <= max; x++) {
            double log = logHipergeometrica(x, fila1, columna1, n);
            if (log <= logObservada + 1e-7) p += Math.exp(log);
        }
        return Math.min(1.0, p);
    }

    private static double logHipergeometrica(long x, long fila1, long columna1, long n) {
        return logCombinaciones(columna1, x) + logCombinaciones(n - columna1, fila1 - x) - logCombinaciones(n, fila1);
    }

    private static double logCombinaciones(long n, long k) {
        return logFactorial(n) - logFactorial(k) - logFactorial(n - k);
    }

    private static double logFactorial(long n) {
        return Gamma.logGamma(n + 1.0);
    }

    /**
     * Con marginales fijas, P(tabla) ∝ 1 / Π n_ij!, así que una tabla es «tan o más extrema» que la observada
     * cuando Σ log(n_ij!) es mayor o igual. Las tablas se generan permutando las etiquetas de columna.
     */
    static double fisherFreemanHaltonMonteCarlo(long[][] tabla) {
        int filas = tabla.length;
        int columnas = tabla[0].length;
        int n = (int) total(tabla);
        int[] etiquetasColumna = new int[n];
        int[] totalesFila = new int[filas];
        int indice = 0;
        for (int i = 0; i < filas; i++) {
            for (int j = 0; j < columnas; j++) {
                totalesFila[i] += (int) tabla[i][j];
                for (long k = 0; k < tabla[i][j]; k++) etiquetasColumna[indice++] = j;
            }
        }
        double estadisticoObservado = sumaLogFactoriales(tabla);
        Random aleatorio = new Random(SEMILLA);
        int extremas = 0;
        long[][] simulada = new long[filas][columnas];
        for (int s = 0; s < SIMULACIONES_MONTE_CARLO; s++) {
            barajar(etiquetasColumna, aleatorio);
            for (long[] fila : simulada) java.util.Arrays.fill(fila, 0L);
            int posicion = 0;
            for (int i = 0; i < filas; i++) {
                for (int k = 0; k < totalesFila[i]; k++) simulada[i][etiquetasColumna[posicion++]]++;
            }
            if (sumaLogFactoriales(simulada) >= estadisticoObservado - 1e-7) extremas++;
        }
        return (extremas + 1.0) / (SIMULACIONES_MONTE_CARLO + 1.0);
    }

    private static double sumaLogFactoriales(long[][] tabla) {
        double suma = 0.0;
        for (long[] fila : tabla) for (long valor : fila) suma += logFactorial(valor);
        return suma;
    }

    private static void barajar(int[] valores, Random aleatorio) {
        for (int i = valores.length - 1; i > 0; i--) {
            int j = aleatorio.nextInt(i + 1);
            int temporal = valores[i];
            valores[i] = valores[j];
            valores[j] = temporal;
        }
    }

    private static double chiCuadrado(long[][] tabla, double[][] esperadas) {
        double suma = 0.0;
        for (int i = 0; i < tabla.length; i++) {
            for (int j = 0; j < tabla[i].length; j++) {
                double diferencia = tabla[i][j] - esperadas[i][j];
                suma += diferencia * diferencia / esperadas[i][j];
            }
        }
        return suma;
    }

    private static double[][] esperadas(long[][] tabla, long n) {
        int filas = tabla.length;
        int columnas = tabla[0].length;
        long[] totalesFila = new long[filas];
        long[] totalesColumna = new long[columnas];
        for (int i = 0; i < filas; i++) {
            for (int j = 0; j < columnas; j++) {
                totalesFila[i] += tabla[i][j];
                totalesColumna[j] += tabla[i][j];
            }
        }
        double[][] esperadas = new double[filas][columnas];
        for (int i = 0; i < filas; i++) {
            for (int j = 0; j < columnas; j++) {
                esperadas[i][j] = totalesFila[i] * (double) totalesColumna[j] / n;
            }
        }
        return esperadas;
    }

    /** Quita filas y columnas sin observaciones: no aportan información y dejarían esperadas en 0. */
    private static long[][] sinMarginalesVacias(long[][] frecuencias) {
        if (frecuencias == null || frecuencias.length == 0 || frecuencias[0] == null) return new long[0][0];
        int columnas = frecuencias[0].length;
        for (long[] fila : frecuencias) {
            if (fila == null || fila.length != columnas) {
                throw new IllegalArgumentException("Todas las filas deben tener el mismo número de columnas");
            }
            for (long valor : fila) {
                if (valor < 0) throw new IllegalArgumentException("Las frecuencias no pueden ser negativas");
            }
        }
        List<Integer> columnasUsadas = new ArrayList<>();
        for (int j = 0; j < columnas; j++) {
            long suma = 0;
            for (long[] fila : frecuencias) suma += fila[j];
            if (suma > 0) columnasUsadas.add(j);
        }
        List<long[]> filasUsadas = new ArrayList<>();
        for (long[] fila : frecuencias) {
            long[] reducida = columnasUsadas.stream().mapToLong(j -> fila[j]).toArray();
            if (java.util.Arrays.stream(reducida).sum() > 0) filasUsadas.add(reducida);
        }
        return filasUsadas.toArray(long[][]::new);
    }

    private static long total(long[][] tabla) {
        long suma = 0;
        for (long[] fila : tabla) for (long valor : fila) suma += valor;
        return suma;
    }

    private static double redondear(double valor, int decimales) {
        double factor = Math.pow(10, decimales);
        return Math.round(valor * factor) / factor;
    }

    private static ResultadoPrueba noAplicable(double alfa, long n, int totalCeldas, String motivo) {
        return new ResultadoPrueba("NO_APLICABLE", "No aplicable", false, null, null, null, alfa, false, motivo,
                n, 0, totalCeldas, null, null, null);
    }

    private static ResultadoPrueba resultado(String codigo, String nombre, Double estadistico, Integer gradosLibertad,
                                             double pValor, double alfa, Contexto contexto, Integer simulaciones,
                                             String motivo) {
        double p = Math.max(0.0, Math.min(1.0, pValor));
        return new ResultadoPrueba(codigo, nombre, true, estadistico, gradosLibertad, redondear(p, 6), alfa, p < alfa,
                motivo, contexto.n(), contexto.celdasMenores5(), contexto.totalCeldas(), contexto.esperadaMinima(),
                contexto.vCramer(), simulaciones);
    }

    private record Contexto(long n, int celdasMenores5, int totalCeldas, double esperadaMinima, double vCramer) { }

    /**
     * @param codigo            CHI_CUADRADO, FISHER_EXACTA, FISHER_FREEMAN_HALTON o NO_APLICABLE
     * @param estadistico       χ² calculado (null en las pruebas exactas)
     * @param rechazaHipotesis  true si p &lt; α: se rechaza la independencia de las variables
     * @param vCramer           tamaño del efecto (0 = sin asociación, 1 = asociación perfecta)
     */
    public record ResultadoPrueba(
            String codigo,
            String nombrePrueba,
            boolean aplicable,
            Double estadistico,
            Integer gradosLibertad,
            Double pValor,
            double alfa,
            boolean rechazaHipotesis,
            String motivo,
            long n,
            int celdasEsperadasMenores5,
            int totalCeldas,
            Double esperadaMinima,
            Double vCramer,
            Integer simulaciones) {
    }
}
