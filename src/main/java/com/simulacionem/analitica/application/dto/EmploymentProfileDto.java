package com.simulacionem.analitica.application.dto;

import java.util.List;
import java.util.UUID;

/** Datos no identificables necesarios para las visualizaciones de empleabilidad. */
public record EmploymentProfileDto(
        UUID datasetId,
        int validResponses,
        List<CohortPointDto> cohortPoints
) {
    public record CohortPointDto(double graduationYear, double professionalYears) { }
}
