package com.simulacionem.analitica.application.service;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class DescriptiveStatisticsTest {

    @Test
    void calculaEstadisticosDescriptivosConPrecisionSolicitada() {
        List<Double> values = List.of(1.0, 2.0, 4.0, 5.0);

        assertEquals(3.0, DescriptiveStatistics.mean(values, 2));
        assertEquals(3.0, DescriptiveStatistics.median(values, 2));
        assertEquals(1.83, DescriptiveStatistics.sampleStandardDeviation(values, 2));
        assertEquals(37.5, DescriptiveStatistics.percentage(3, 8, 1));
        DescriptiveStatistics.Summary summary = DescriptiveStatistics.summarize(values, 2);
        assertEquals(4, summary.count());
        assertEquals(3.0, summary.mean());
        assertEquals(3.0, summary.median());
        assertEquals(1.83, summary.sampleStandardDeviation());
        assertEquals(Map.of("A", 50.0, "B", 25.0),
                DescriptiveStatistics.percentages(Map.of("A", 2L, "B", 1L), 4, 1));
    }

    @Test
    void noDefineDesviacionConUnaObservacionNiPorcentajeSinBase() {
        assertNull(DescriptiveStatistics.sampleStandardDeviation(List.of(4.0), 2));
        assertNull(DescriptiveStatistics.percentage(1, 0, 2));
    }
}
