package com.simulacionem.analitica.application.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AnalysisRulesTest {

    @Test
    void excluyeRespuestasQueNoRepresentanUnValorAnalizable() {
        assertFalse(AnalysisRules.isAnalyticValue(null));
        assertFalse(AnalysisRules.isAnalyticValue(" "));
        assertFalse(AnalysisRules.isAnalyticValue("No sabe"));
        assertFalse(AnalysisRules.isAnalyticValue("No observado"));
        assertFalse(AnalysisRules.isAnalyticValue("No observada"));
        assertTrue(AnalysisRules.isAnalyticValue("Parcialmente de acuerdo"));
        assertEquals("'no sabe', 'no observado', 'no observada'", AnalysisRules.excludedLabelsSql());
        assertEquals(10, AnalysisRules.MINIMUM_CONTINGENCY_SAMPLE);
        assertEquals(30, AnalysisRules.MINIMUM_ASSOCIATION_SAMPLE);
    }
}
