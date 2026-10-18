package com.simulacionem.analitica.application.service;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class AssociationStatisticsTest {

    @Test
    void spearmanUsaRangosMediosParaEmpates() {
        assertEquals(1.0, AssociationStatistics.spearman(List.of(
                new double[] {1, 10}, new double[] {2, 20}, new double[] {2, 20}, new double[] {4, 40})));
        assertArrayEquals(new double[] {1.0, 2.5, 2.5, 4.0},
                AssociationStatistics.ranks(new double[] {1, 2, 2, 4}));
    }

    @Test
    void spearmanNoSeDefineConVariableConstante() {
        assertNull(AssociationStatistics.spearman(List.of(
                new double[] {1, 3}, new double[] {1, 4}, new double[] {1, 5})));
    }
}
