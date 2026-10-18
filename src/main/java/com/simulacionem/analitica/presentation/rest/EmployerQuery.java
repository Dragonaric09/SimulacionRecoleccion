package com.simulacionem.analitica.presentation.rest;

import com.simulacionem.analitica.application.service.EmployerFilters;

import java.util.List;
import java.util.UUID;

/**
 * Parámetros de filtro de los endpoints de empleadores. Cada lista admite varios valores repitiendo el parámetro;
 * «Sin respuesta» selecciona las organizaciones que no contestaron esa pregunta.
 */
public record EmployerQuery(UUID datasetId, List<String> organizationType, List<String> organizationSize,
                            List<String> sector, List<String> department, List<String> hired,
                            List<String> hiringProbability) {

    public EmployerFilters toFilters() {
        return new EmployerFilters(datasetId, organizationType, organizationSize, sector, department, hired, hiringProbability);
    }
}
