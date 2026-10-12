package com.simulacionem.analitica.application.dto;

import java.util.Map;

/**
 * Estadísticos de una competencia. {@code validCount}, la media y la desviación estándar excluyen
 * los «No observado»; esos se reportan aparte en {@code notObservedCount}.
 */
public record CompetenceAverageDto(String code, String name, String group, long validCount, double average,
        Double standardDeviation, Double median, Integer modalLevel,
        Map<Integer, Long> levelCounts, long notObservedCount) {
}
