package com.simulacionem.analitica.application.dto;

import java.util.Map;
import java.util.UUID;

public record AnalyticsSummaryDto(UUID datasetId, String surveyType, long totalResponses, long validResponses,
                                  Map<String, CategoryDistributionDto> distributions,
                                  Map<String, Double> numericAverages,
                                  Map<String, Double> numericMedians,
                                  Map<String, Double> numericStandardDeviations,
                                  boolean smallSample) { }
