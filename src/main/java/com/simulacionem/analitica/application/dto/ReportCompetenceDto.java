package com.simulacionem.analitica.application.dto;

import java.util.Map;

/** Agregados seguros para imprimir una competencia en el reporte. Nunca contiene respuestas individuales. */
public record ReportCompetenceDto(String code, String name, String group, long validCount,
                                  Double average, Double standardDeviation, Double median,
                                  Map<Integer, Long> levelCounts, long notObservedCount) {
    public static ReportCompetenceDto from(CompetenceAverageDto source) {
        return new ReportCompetenceDto(source.code(), source.name(), source.group(), source.validCount(),
                source.average(), source.standardDeviation(), source.median(), source.levelCounts(),
                source.notObservedCount());
    }

    public static ReportCompetenceDto from(EmployerDashboardDto.CompetenceDto source) {
        return new ReportCompetenceDto(source.code(), source.name(), source.group(), source.answered(),
                source.average(), source.standardDeviation(), source.median(),
                source.levels(), source.notObserved());
    }
}
