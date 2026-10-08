package com.simulacionem.analitica.application.dto;

import java.util.Map;

public record CategoryDistributionDto(long validCount, Map<String, Long> counts, Map<String, Double> percentages) { }
