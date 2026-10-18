package com.simulacionem.analitica.application.service;

import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Operaciones descriptivas compartidas por las analíticas de titulados y empleadores.
 *
 * <p>La clase no decide qué respuestas son válidas. Esa decisión pertenece al servicio
 * que conoce el formulario; aquí solo se procesan los valores que ya fueron filtrados.</p>
 */
final class DescriptiveStatistics {

    record Summary(long count, Double mean, Double median, Double sampleStandardDeviation) {
    }

    private DescriptiveStatistics() {
    }

    static Double mean(List<Double> values, int decimals) {
        if (values == null || values.isEmpty()) return null;
        return round(values.stream().mapToDouble(Double::doubleValue).average().orElse(0), decimals);
    }

    static Summary summarize(List<Double> values, int decimals) {
        if (values == null || values.isEmpty()) return new Summary(0, null, null, null);
        return new Summary(values.size(), mean(values, decimals), median(values, decimals),
                sampleStandardDeviation(values, decimals));
    }

    static Double median(List<Double> values, int decimals) {
        if (values == null || values.isEmpty()) return null;
        List<Double> sorted = values.stream().sorted().toList();
        int middle = sorted.size() / 2;
        double value = sorted.size() % 2 == 0
                ? (sorted.get(middle - 1) + sorted.get(middle)) / 2.0
                : sorted.get(middle);
        return round(value, decimals);
    }

    /** Desviación estándar muestral; no se define para una sola observación. */
    static Double sampleStandardDeviation(List<Double> values, int decimals) {
        if (values == null || values.size() < 2) return null;
        double mean = values.stream().mapToDouble(Double::doubleValue).average().orElse(0);
        double variance = values.stream()
                .mapToDouble(value -> Math.pow(value - mean, 2))
                .sum() / (values.size() - 1);
        return round(Math.sqrt(variance), decimals);
    }

    static Double percentage(long part, long base, int decimals) {
        return base == 0 ? null : round(part * 100.0 / base, decimals);
    }

    static double percentageOrZero(long part, long base, int decimals) {
        return base == 0 ? 0 : round(part * 100.0 / base, decimals);
    }

    static Map<String, Double> percentages(Map<String, Long> counts, long base, int decimals) {
        Map<String, Double> result = new LinkedHashMap<>();
        counts.forEach((key, count) -> result.put(key, percentageOrZero(count, base, decimals)));
        return result;
    }

    static double round(double value, int decimals) {
        double factor = Math.pow(10, decimals);
        return Math.round(value * factor) / factor;
    }
}
