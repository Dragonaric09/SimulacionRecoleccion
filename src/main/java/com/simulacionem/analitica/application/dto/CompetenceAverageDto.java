package com.simulacionem.analitica.application.dto;

import java.util.Map;

public record CompetenceAverageDto(String code, String name, String group, long validCount, double average,
        Double standardDeviation, Double median, Integer modalLevel,
        Map<Integer, Long> levelCounts) {
}
