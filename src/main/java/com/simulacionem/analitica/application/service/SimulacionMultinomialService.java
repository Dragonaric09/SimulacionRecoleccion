package com.simulacionem.analitica.application.service;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.Random;

/**
 * Simulación Monte Carlo de una variable categórica por transformada inversa sobre su distribución acumulada.
 *
 * <p>El rango del 95 % de cada categoría son los percentiles 2,5 y 97,5 de sus réplicas (interpolación
 * inclusiva, la misma convención que PERCENTILE.INC de Excel). Describe la variación de los sorteos simulados;
 * no es un intervalo de confianza sobre la población.
 *
 * <p>La comparación contra el escenario base usa números aleatorios comunes: ambos escenarios se simulan con la
 * misma semilla, así que cada réplica de uno se empareja con la del otro y la diferencia refleja solo el cambio de
 * probabilidades, no el azar del muestreo. Con probabilidades iguales la diferencia es exactamente cero.
 */
@Service
public class SimulacionMultinomialService {

    /** Límites de la simulación, iguales a los de la pantalla de escenarios. */
    public static final int MAX_SAMPLE = 10_000;
    public static final int MAX_REPETITIONS = 5_000;
    private static final int FIRST_DRAWS = 10;

    public SimulationResult simular(SimulationRequest request) {
        validate(request.categories(), request.probabilities(), request.sampleSize(), request.repetitions());
        Run run = run(request.probabilities(), request.sampleSize(), request.repetitions(), request.seed(), request.categories());
        return summarize(request.categories(), request.probabilities(), request.observedCounts(), request.sampleSize(),
                request.repetitions(), request.seed(), run);
    }

    /** Escenario base y escenario ajustado con los mismos sorteos, y la diferencia réplica a réplica por categoría. */
    public ScenarioComparison comparar(ComparisonRequest request) {
        validate(request.categories(), request.baseProbabilities(), request.sampleSize(), request.repetitions());
        validate(request.categories(), request.scenarioProbabilities(), request.sampleSize(), request.repetitions());
        Run base = run(request.baseProbabilities(), request.sampleSize(), request.repetitions(), request.seed(), request.categories());
        Run scenario = run(request.scenarioProbabilities(), request.sampleSize(), request.repetitions(), request.seed(), request.categories());

        List<CategoryDifference> differences = new ArrayList<>();
        double scale = 100.0 / request.sampleSize();
        for (int i = 0; i < request.categories().size(); i++) {
            double[] values = new double[request.repetitions()];
            int higher = 0;
            int lower = 0;
            double sum = 0;
            for (int r = 0; r < request.repetitions(); r++) {
                double difference = (scenario.counts()[r][i] - base.counts()[r][i]) * scale;
                values[r] = difference;
                sum += difference;
                if (difference > 0) higher++;
                if (difference < 0) lower++;
            }
            Arrays.sort(values);
            double replicas = request.repetitions();
            differences.add(new CategoryDifference(request.categories().get(i), round(sum / replicas),
                    round(percentile(values, 0.025)), round(percentile(values, 0.975)),
                    round(higher * 100.0 / replicas), round(lower * 100.0 / replicas)));
        }
        return new ScenarioComparison(
                summarize(request.categories(), request.baseProbabilities(), request.observedCounts(), request.sampleSize(),
                        request.repetitions(), request.seed(), base),
                summarize(request.categories(), request.scenarioProbabilities(), request.observedCounts(), request.sampleSize(),
                        request.repetitions(), request.seed(), scenario),
                differences);
    }

    // ---------------------------------------------------------------- muestreo

    /** Conteos por réplica y categoría. El orden de los sorteos es el mismo que el de versiones anteriores. */
    private record Run(int[][] counts, double[] cumulative, List<SimulationDraw> firstDraws) { }

    private static Run run(List<Double> probabilities, int sampleSize, int repetitions, long seed, List<String> categories) {
        double[] cumulative = new double[probabilities.size()];
        double running = 0;
        for (int i = 0; i < probabilities.size(); i++) {
            running += probabilities.get(i);
            cumulative[i] = running;
        }
        Random random = new Random(seed);
        int[][] counts = new int[repetitions][probabilities.size()];
        List<SimulationDraw> firstDraws = new ArrayList<>();
        for (int repetition = 0; repetition < repetitions; repetition++) {
            for (int draw = 0; draw < sampleSize; draw++) {
                double value = random.nextDouble();
                int category = inverse(cumulative, value);
                counts[repetition][category]++;
                if (repetition == 0 && firstDraws.size() < FIRST_DRAWS) {
                    firstDraws.add(new SimulationDraw(round(value), categories.get(category)));
                }
            }
        }
        return new Run(counts, cumulative, firstDraws);
    }

    /** Transformada inversa: primera categoría cuya probabilidad acumulada alcanza el número aleatorio. */
    static int inverse(double[] cumulative, double value) {
        for (int index = 0; index < cumulative.length; index++) {
            if (value <= cumulative[index]) return index;
        }
        return cumulative.length - 1;
    }

    private static SimulationResult summarize(List<String> categories, List<Double> probabilities, List<Long> observedCounts,
                                              int sampleSize, int repetitions, long seed, Run run) {
        long observedTotal = observedCounts == null ? 0L : observedCounts.stream().filter(Objects::nonNull).mapToLong(Long::longValue).sum();
        List<SimulationCategory> result = new ArrayList<>();
        for (int i = 0; i < categories.size(); i++) {
            List<Double> replicas = new ArrayList<>(repetitions);
            double sum = 0;
            double squares = 0;
            for (int r = 0; r < repetitions; r++) {
                double percentage = run.counts()[r][i] * 100.0 / sampleSize;
                replicas.add(round(percentage));
                sum += percentage;
                squares += percentage * percentage;
            }
            double mean = sum / repetitions;
            double deviation = repetitions > 1 ? Math.sqrt(Math.max(0, (squares - repetitions * mean * mean) / (repetitions - 1))) : 0;
            double[] sorted = replicas.stream().mapToDouble(Double::doubleValue).sorted().toArray();
            long observedCount = observedCounts != null && i < observedCounts.size() && observedCounts.get(i) != null
                    ? observedCounts.get(i) : 0L;
            double observedPercentage = observedTotal > 0 ? observedCount * 100.0 / observedTotal : probabilities.get(i) * 100;
            result.add(new SimulationCategory(categories.get(i), observedCount, round(observedPercentage), round(mean),
                    round(percentile(sorted, 0.025)), round(percentile(sorted, 0.975)), round(deviation), replicas,
                    round(percentile(sorted, 0.25)), round(percentile(sorted, 0.50)), round(percentile(sorted, 0.75))));
        }
        List<Double> cumulativeRounded = new ArrayList<>();
        for (double value : run.cumulative()) cumulativeRounded.add(round(value));
        return new SimulationResult(sampleSize, repetitions, seed, result, cumulativeRounded, run.firstDraws());
    }

    // ---------------------------------------------------------------- utilidades

    static void validate(List<String> categories, List<Double> probabilities, int sampleSize, int repetitions) {
        if (categories == null || probabilities == null || categories.isEmpty()
                || categories.size() != probabilities.size() || sampleSize < 1 || repetitions < 1) {
            throw new IllegalArgumentException("Las categorías, probabilidades, tamaño y repeticiones son obligatorios y válidos");
        }
        // Los mismos límites que la interfaz, validados también aquí para acotar el trabajo del servidor (H-03).
        if (sampleSize > MAX_SAMPLE || repetitions > MAX_REPETITIONS) {
            throw new IllegalArgumentException("El tamaño de muestra admite hasta " + MAX_SAMPLE
                    + " y las réplicas hasta " + MAX_REPETITIONS);
        }
        // Un elemento nulo producía NullPointerException y un 500 (H-04).
        if (probabilities.stream().anyMatch(Objects::isNull) || categories.stream().anyMatch(Objects::isNull)) {
            throw new IllegalArgumentException("Las categorías y probabilidades no pueden tener valores vacíos");
        }
        double total = probabilities.stream().mapToDouble(Double::doubleValue).sum();
        if (probabilities.stream().anyMatch(value -> value < 0 || !Double.isFinite(value)) || Math.abs(total - 1.0) > 0.0001) {
            throw new IllegalArgumentException("Las probabilidades deben ser no negativas y sumar 1");
        }
    }

    /** Percentil con interpolación inclusiva (PERCENTILE.INC) sobre valores ya ordenados. */
    static double percentile(double[] sorted, double probability) {
        if (sorted.length == 0) return 0;
        double position = probability * (sorted.length - 1);
        int lower = (int) Math.floor(position);
        int upper = (int) Math.ceil(position);
        if (lower == upper) return sorted[lower];
        return sorted[lower] + (position - lower) * (sorted[upper] - sorted[lower]);
    }

    private static double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    // ---------------------------------------------------------------- contrato

    public record SimulationRequest(List<String> categories, List<Double> probabilities, List<Long> observedCounts,
                                    int sampleSize, int repetitions, long seed) { }

    /**
     * @param lower95 percentil 2,5 de las réplicas
     * @param upper95 percentil 97,5 de las réplicas
     */
    public record SimulationCategory(String category, long observedCount, double observedPercentage,
                                     double simulatedMean, double lower95, double upper95,
                                     double standardDeviation, List<Double> replicaPercentages,
                                     double firstQuartile, double median, double thirdQuartile) { }

    public record SimulationDraw(double random, String category) { }

    public record SimulationResult(int sampleSize, int repetitions, long seed, List<SimulationCategory> categories,
                                   List<Double> cumulativeProbabilities, List<SimulationDraw> firstDraws) { }

    public record ComparisonRequest(List<String> categories, List<Double> baseProbabilities,
                                    List<Double> scenarioProbabilities, List<Long> observedCounts,
                                    int sampleSize, int repetitions, long seed) { }

    /**
     * Diferencia escenario − base de una categoría, en puntos porcentuales, sobre réplicas emparejadas.
     *
     * @param shareHigher porcentaje de réplicas en que el escenario supera al base
     * @param shareLower  porcentaje de réplicas en que el escenario queda por debajo del base
     */
    public record CategoryDifference(String category, double meanDifference, double lower95, double upper95,
                                     double shareHigher, double shareLower) { }

    public record ScenarioComparison(SimulationResult base, SimulationResult scenario, List<CategoryDifference> differences) { }
}
