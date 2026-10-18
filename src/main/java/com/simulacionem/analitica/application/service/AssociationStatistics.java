package com.simulacionem.analitica.application.service;

import java.util.Arrays;
import java.util.Comparator;
import java.util.List;

/** Cálculos de asociación que pueden reutilizar distintos análisis de formularios. */
final class AssociationStatistics {

    private AssociationStatistics() {
    }

    /** ρ de Spearman con rangos medios; null si alguna variable es constante. */
    static Double spearman(List<double[]> pairs) {
        double[] x = ranks(pairs.stream().mapToDouble(v -> v[0]).toArray());
        double[] y = ranks(pairs.stream().mapToDouble(v -> v[1]).toArray());
        double mx = Arrays.stream(x).average().orElse(0);
        double my = Arrays.stream(y).average().orElse(0);
        double covariance = 0;
        double varianceX = 0;
        double varianceY = 0;
        for (int i = 0; i < x.length; i++) {
            covariance += (x[i] - mx) * (y[i] - my);
            varianceX += Math.pow(x[i] - mx, 2);
            varianceY += Math.pow(y[i] - my, 2);
        }
        return varianceX == 0 || varianceY == 0
                ? null
                : covariance / Math.sqrt(varianceX * varianceY);
    }

    /** Rangos medios para empates, necesarios para escalas Likert. */
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
}
