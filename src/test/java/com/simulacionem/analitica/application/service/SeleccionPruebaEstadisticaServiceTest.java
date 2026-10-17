package com.simulacionem.analitica.application.service;

import org.apache.commons.math3.stat.inference.ChiSquareTest;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SeleccionPruebaEstadisticaServiceTest {

    private final SeleccionPruebaEstadisticaService service = new SeleccionPruebaEstadisticaService();

    @Test
    void debeElegirChiCuadradoCuandoLaTablaEsCategorialYHayFrecuenciasSuficientes() {
        long[][] frecuencias = {
                {20, 10},
                {15, 25}
        };

        var resultado = service.seleccionar(frecuencias, 0.05);

        assertEquals("CHI_CUADRADO", resultado.codigo());
        assertEquals("Chi-cuadrado de Pearson", resultado.nombrePrueba());
        assertTrue(resultado.aplicable());
        // Esperadas 15/15/20/20 → χ² = 2·(25/15) + 2·(25/20) = 5,8333
        assertEquals(5.8333, resultado.estadistico(), 1e-4);
        assertEquals(1, resultado.gradosLibertad());
        assertEquals(0.015729, resultado.pValor(), 1e-5);
        assertTrue(resultado.rechazaHipotesis());
        assertEquals(0.2887, resultado.vCramer(), 1e-4);
    }

    @Test
    void debeElegirFisherCuandoLaTablaEs2x2YHayCeldasSparses() {
        long[][] frecuencias = {
                {1, 9},
                {8, 2}
        };

        var resultado = service.seleccionar(frecuencias, 0.05);

        assertEquals("FISHER_EXACTA", resultado.codigo());
        assertEquals("Fisher exacta", resultado.nombrePrueba());
        assertTrue(resultado.aplicable());
        // Bilateral: (11 + 495 + 495 + 11) / C(20,10) = 1012 / 184756
        assertEquals(1012.0 / 184756.0, resultado.pValor(), 1e-6);
        assertTrue(resultado.rechazaHipotesis());
        assertNull(resultado.estadistico());
    }

    @Test
    void fisherNoDebeRechazarCuandoNoHayAsociacion() {
        var resultado = service.seleccionar(new long[][] {{3, 3}, {3, 3}}, 0.05);

        assertEquals("FISHER_EXACTA", resultado.codigo());
        assertEquals(1.0, resultado.pValor(), 1e-9);
        assertFalse(resultado.rechazaHipotesis());
    }

    @Test
    void debeUsarFisherFreemanHaltonEnTablasGrandesConEsperadasBajas() {
        long[][] frecuencias = {
                {8, 1, 0},
                {1, 6, 1},
                {0, 2, 5}
        };

        var resultado = service.seleccionar(frecuencias, 0.05);

        assertEquals("FISHER_FREEMAN_HALTON", resultado.codigo());
        assertTrue(resultado.aplicable());
        assertTrue(resultado.pValor() > 0 && resultado.pValor() < 0.01);
        assertTrue(resultado.rechazaHipotesis());
        assertEquals(SeleccionPruebaEstadisticaService.SIMULACIONES_MONTE_CARLO, resultado.simulaciones());
    }

    @Test
    void monteCarloDebeAproximarElFisherExactoEn2x2() {
        long[][] frecuencias = {{1, 9}, {8, 2}};

        double exacto = SeleccionPruebaEstadisticaService.fisherExacta2x2(frecuencias);
        double simulado = SeleccionPruebaEstadisticaService.fisherFreemanHaltonMonteCarlo(frecuencias);

        assertEquals(exacto, simulado, 0.003);
    }

    @Test
    void chiCuadradoRxCDebeCoincidirConCommonsMath() {
        long[][] frecuencias = {
                {30, 20, 25},
                {15, 35, 20},
                {25, 15, 30}
        };

        var resultado = service.seleccionar(frecuencias, 0.05);

        assertEquals("CHI_CUADRADO", resultado.codigo());
        assertEquals(new ChiSquareTest().chiSquare(frecuencias), resultado.estadistico(), 1e-3);
        assertEquals(new ChiSquareTest().chiSquareTest(frecuencias), resultado.pValor(), 1e-5);
        assertEquals(4, resultado.gradosLibertad());
    }

    @Test
    void noDebeAplicarseConMuestraMenorA10() {
        var resultado = service.seleccionar(new long[][] {{2, 1}, {1, 3}}, 0.05);

        assertEquals("NO_APLICABLE", resultado.codigo());
        assertFalse(resultado.aplicable());
        assertFalse(resultado.rechazaHipotesis());
    }

    @Test
    void noDebeAplicarseConVariablesDeRespuestaMultiple() {
        var resultado = service.seleccionar(new long[][] {{20, 10}, {15, 25}}, 0.05, true);

        assertEquals("NO_APLICABLE", resultado.codigo());
        assertFalse(resultado.aplicable());
    }

    @Test
    void debeIgnorarFilasYColumnasVacias() {
        long[][] frecuencias = {
                {20, 10, 0},
                {0, 0, 0},
                {15, 25, 0}
        };

        var resultado = service.seleccionar(frecuencias, 0.05);

        assertEquals("CHI_CUADRADO", resultado.codigo());
        assertEquals(4, resultado.totalCeldas());
        assertEquals(5.8333, resultado.estadistico(), 1e-4);
    }
}
