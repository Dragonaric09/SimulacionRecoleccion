package com.simulacionem.analitica.application.dto;

public record CompetenceAverageDto(String code, String name, String group, long validCount, double average,
                                   Double standardDeviation) { }
