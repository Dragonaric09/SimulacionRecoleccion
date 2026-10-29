package com.simulacionem.analitica.application.dto;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public record CrossTabulationDto(UUID datasetId, String rowField, String columnField, long validCount,
                                 List<String> rowCategories, List<String> columnCategories,
                                 Map<String, Map<String, Long>> counts,
                                 Map<String, Map<String, Double>> percentages,
                                 boolean smallSample, boolean multipleResponse, Map<String, Long> rowBases,
                                 Map<String, Long> columnBases) {
    public CrossTabulationDto(UUID datasetId, String rowField, String columnField, long validCount,
                              List<String> rowCategories, List<String> columnCategories,
                              Map<String, Map<String, Long>> counts,
                              Map<String, Map<String, Double>> percentages, boolean smallSample) {
        this(datasetId, rowField, columnField, validCount, rowCategories, columnCategories,
                counts, percentages, smallSample, false, Map.of(), Map.of());
    }

    public CrossTabulationDto(UUID datasetId, String rowField, String columnField, long validCount,
                              List<String> rowCategories, List<String> columnCategories,
                              Map<String, Map<String, Long>> counts,
                              Map<String, Map<String, Double>> percentages,
                              boolean smallSample, boolean multipleResponse) {
        this(datasetId, rowField, columnField, validCount, rowCategories, columnCategories,
                counts, percentages, smallSample, multipleResponse, Map.of(), Map.of());
    }

    public CrossTabulationDto(UUID datasetId, String rowField, String columnField, long validCount,
                              List<String> rowCategories, List<String> columnCategories,
                              Map<String, Map<String, Long>> counts,
                              Map<String, Map<String, Double>> percentages, boolean smallSample,
                              boolean multipleResponse, Map<String, Long> rowBases) {
        this(datasetId, rowField, columnField, validCount, rowCategories, columnCategories,
                counts, percentages, smallSample, multipleResponse, rowBases, Map.of());
    }
}
