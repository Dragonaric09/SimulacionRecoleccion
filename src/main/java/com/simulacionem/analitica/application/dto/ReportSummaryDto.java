package com.simulacionem.analitica.application.dto;

import java.util.Map;
import java.util.List;

/** Contrato mínimo del Reporte: agregados permitidos, sin identificadores técnicos del dataset. */
public record ReportSummaryDto(long totalResponses, long validResponses,
                               Map<String, CategoryDistributionDto> distributions,
                               Map<String, Double> numericAverages,
                               Map<String, Double> numericMedians,
                               Map<String, Double> numericStandardDeviations,
                               boolean smallSample,
                               Integer yearMin,
                               Integer yearMax,
                               List<String> availableFields) {
    public static ReportSummaryDto from(AnalyticsSummaryDto summary, List<String> availableFields) {
        return new ReportSummaryDto(summary.totalResponses(), summary.validResponses(), summary.distributions(),
                summary.numericAverages(), summary.numericMedians(), summary.numericStandardDeviations(),
                summary.smallSample(), summary.yearMin(), summary.yearMax(), availableFields);
    }
}
