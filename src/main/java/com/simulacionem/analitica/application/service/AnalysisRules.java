package com.simulacionem.analitica.application.service;

import java.util.Locale;

/** Reglas compartidas para definir bases válidas y advertencias de muestra. */
final class AnalysisRules {

    static final int MINIMUM_DESCRIPTIVE_SAMPLE = 5;
    static final int MINIMUM_ASSOCIATION_SAMPLE = 30;
    static final int MINIMUM_CONTINGENCY_SAMPLE = 10;
    static final int MINIMUM_GROUP_FOR_ASYMPTOTIC_MANN_WHITNEY = 10;
    static final int MINIMUM_GROUP_FOR_ASYMPTOTIC_KRUSKAL = 5;
    static final int MAXIMUM_PERMUTATION_SAMPLE = 2_000;
    static final String NO_SABE = "no sabe";
    static final String NO_OBSERVADO = "no observado";
    static final String NO_OBSERVADA = "no observada";
    static final String OBSERVED_NUMERIC_SQL = "NOT r.not_observed AND r.numeric_value IS NOT NULL";

    private AnalysisRules() {
    }

    static boolean isAnalyticValue(String value) {
        if (value == null || value.isBlank()) return false;
        String normalized = value.trim().toLowerCase(Locale.ROOT);
        return !NO_SABE.equals(normalized)
                && !NO_OBSERVADO.equals(normalized)
                && !NO_OBSERVADA.equals(normalized);
    }

    /** Valores textuales que deben quedar fuera de una distribución analítica SQL. */
    static String excludedLabelsSql() {
        return "'" + NO_SABE + "', '" + NO_OBSERVADO + "', '" + NO_OBSERVADA + "'";
    }
}
