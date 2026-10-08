package com.simulacionem.analitica.application.dto;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public record CrossTabulationDto(UUID datasetId, String rowField, String columnField, long validCount,
                                 List<String> rowCategories, List<String> columnCategories,
                                 Map<String, Map<String, Long>> counts,
                                 Map<String, Map<String, Double>> percentages,
                                 boolean smallSample) { }
