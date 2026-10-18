package com.simulacionem.analitica.presentation.rest;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.simulacionem.analitica.application.dto.AnalyticsSummaryDto;
import com.simulacionem.analitica.application.dto.CategoryDistributionDto;
import com.simulacionem.analitica.application.dto.ReportSummaryDto;
import com.simulacionem.analitica.application.service.AnalyticsService;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AnalyticsControllerPrivacyTest {
    @Test
    void reporteFiltraCamposYNoExponeIdentificadoresTecnicos() throws Exception {
        AnalyticsService analytics = mock(AnalyticsService.class);
        UUID datasetId = UUID.randomUUID();
        AnalyticsSummaryDto summary = new AnalyticsSummaryDto(datasetId, "TITULADOS", 10, 10,
                Map.of("sector_trabajo", new CategoryDistributionDto(10, Map.of("Público", 10L), Map.of("Público", 100.0))),
                Map.of(), Map.of(), Map.of(), false, 2018, 2024);
        when(analytics.summary(eq(datasetId), eq("TITULADOS"), eq(List.of("sector_trabajo")), org.mockito.ArgumentMatchers.any()))
                .thenReturn(summary);
        when(analytics.availableFields(datasetId, "TITULADOS"))
                .thenReturn(List.of("sector_trabajo", "nombre", "correo", "column_1"));

        AnalyticsController controller = new AnalyticsController(analytics);
        ReportSummaryDto report = controller.reportTituladosSummary(datasetId,
                "sector_trabajo,nombre,correo,column_1", query());
        String json = new ObjectMapper().writeValueAsString(report);

        verify(analytics).summary(eq(datasetId), eq("TITULADOS"), eq(List.of("sector_trabajo")), org.mockito.ArgumentMatchers.any());
        assertTrue(json.contains("distributions"));
        assertFalse(json.contains("datasetId"));
        assertFalse(json.contains("surveyType"));
        assertFalse(json.contains("nombre"));
        assertFalse(json.contains("correo"));
        assertTrue(report.availableFields().contains("sector_trabajo"));
        assertFalse(report.availableFields().contains("nombre"));
        assertFalse(report.availableFields().contains("correo"));
        assertFalse(report.availableFields().contains("column_1"));
    }

    private TituladosQuery query() {
        return new TituladosQuery(null, null, List.of(), List.of(), List.of(), List.of(), List.of(), List.of(), List.of());
    }
}
