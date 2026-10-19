package com.simulacionem.analitica.application.dto;

/**
 * Datos de toda la sección de empleabilidad de titulados.
 *
 * Un único cálculo comparte la misma población filtrada entre todos los indicadores y evita que
 * cada tarjeta vuelva a resolver el filtro de la URL por separado.
 */
public record EmploymentDashboardDto(
        AnalyticsSummaryDto summary,
        EmploymentProfileDto profile,
        AnalyticsSummaryDto unemploymentSummary,
        AnalyticsSummaryDto firstEmploymentSummary,
        AnalyticsSummaryDto entrepreneurshipSummary
) { }
