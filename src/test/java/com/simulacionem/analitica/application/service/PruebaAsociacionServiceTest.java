package com.simulacionem.analitica.application.service;

import com.simulacionem.analitica.application.service.EmployerVariableCatalog.Level;
import com.simulacionem.analitica.application.service.PruebaAsociacionService.ResultadoAsociacion;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

/** Valores de referencia calculados con scipy.stats (spearmanr, mannwhitneyu, kruskal). */
class PruebaAsociacionServiceTest {

    private final PruebaAsociacionService service = new PruebaAsociacionService(new SeleccionPruebaEstadisticaService());

    @Test
    void ordinalPorOrdinalUsaSpearmanConRangosMedios() {
        // x = [1, 2, 3, 4, 5], y = [5, 6, 7, 8, 7] → ρ = 0.8208 (scipy.stats.spearmanr)
        long[][] tabla = {
                {1, 0, 0, 0},
                {0, 1, 0, 0},
                {0, 0, 1, 0},
                {0, 0, 0, 1},
                {0, 0, 1, 0}};
        assertThat(PruebaAsociacionService.rhoDeTabla(tabla)).isCloseTo(0.8208, within(1e-4));
    }

    @Test
    void spearmanConMuestraChicaUsaPermutacion() {
        long[][] tabla = {{4, 1, 0}, {1, 3, 1}, {0, 1, 4}};
        ResultadoAsociacion r = service.analizar(tabla, Level.ORDINAL, Level.ORDINAL, 0.05);
        assertThat(r.codigo()).isEqualTo("SPEARMAN");
        assertThat(r.metodoP()).startsWith("Monte Carlo");
        assertThat(r.efecto()).isPositive();
        assertThat(r.significativo()).isTrue();
    }

    @Test
    void spearmanConMuestraGrandeUsaAproximacionT() {
        long[][] tabla = {{10, 5, 2}, {4, 10, 5}, {2, 5, 10}};
        ResultadoAsociacion r = service.analizar(tabla, Level.ORDINAL, Level.ORDINAL, 0.05);
        assertThat(r.metodoP()).startsWith("Asintótico");
        assertThat(r.pValor()).isCloseTo(PruebaAsociacionService.pSpearmanT(PruebaAsociacionService.rhoDeTabla(tabla), 53),
                within(1e-6));
    }

    @Test
    void uDeMannWhitneyCoincideConScipy() {
        // x = [19, 22, 16, 29, 24], y = [20, 11, 17, 12] → U = 17
        // Columnas: 11, 12, 16, 17, 19, 20, 22, 24, 29
        long[][] tabla = {
                {0, 0, 1, 0, 1, 0, 1, 1, 1},
                {1, 1, 0, 1, 0, 1, 0, 0, 0}};
        assertThat(PruebaAsociacionService.uMannWhitney(tabla)).isEqualTo(17.0);
    }

    /** x = [19, 22, 16, 29, 24, 27], y = [20, 11, 17, 12, 15] → U = 27, p exacto bilateral = 0.0303. */
    private static final long[][] MANN_WHITNEY = {
            // Columnas: 11, 12, 15, 16, 17, 19, 20, 22, 24, 27, 29
            {0, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1},
            {1, 1, 1, 0, 1, 0, 1, 0, 0, 0, 0}};

    @Test
    void dosGruposPorOrdinalUsaMannWhitney() {
        ResultadoAsociacion r = service.analizar(MANN_WHITNEY, Level.BINARIA, Level.ORDINAL, 0.05);
        assertThat(r.codigo()).isEqualTo("MANN_WHITNEY");
        assertThat(r.estadistico()).isEqualTo(27.0);
        assertThat(r.metodoP()).startsWith("Monte Carlo");
        assertThat(r.pValor()).isCloseTo(0.0303, within(0.006));
        assertThat(r.efecto()).isCloseTo(2 * 27.0 / 30 - 1, within(1e-4));
    }

    @Test
    void laVariableOrdinalPuedeEstarEnLasFilas() {
        long[][] transpuesta = new long[11][2];
        for (int i = 0; i < 2; i++) for (int j = 0; j < 11; j++) transpuesta[j][i] = MANN_WHITNEY[i][j];
        ResultadoAsociacion r = service.analizar(transpuesta, Level.ORDINAL, Level.BINARIA, 0.05);
        assertThat(r.codigo()).isEqualTo("MANN_WHITNEY");
        assertThat(r.estadistico()).isEqualTo(27.0);
    }

    @Test
    void tresGruposPorOrdinalUsaKruskalWallis() {
        // x = [1, 3, 5, 7, 9], y = [2, 4, 6, 8, 10] → H = 0.2727, p = 0.6015 (χ², 1 gl)
        long[][] dosGrupos = {
                {1, 0, 1, 0, 1, 0, 1, 0, 1, 0},
                {0, 1, 0, 1, 0, 1, 0, 1, 0, 1}};
        assertThat(PruebaAsociacionService.hKruskalWallis(dosGrupos)).isCloseTo(0.2727, within(1e-4));

        long[][] tresGrupos = {{3, 1, 1}, {1, 3, 1}, {1, 1, 3}, {2, 2, 1}};
        ResultadoAsociacion r = service.analizar(tresGrupos, Level.NOMINAL, Level.ORDINAL, 0.05);
        assertThat(r.codigo()).isEqualTo("KRUSKAL_WALLIS");
        assertThat(r.gradosLibertad()).isEqualTo(3);
        assertThat(r.efectoNombre()).startsWith("ε²");
    }

    @Test
    void kruskalWallisCorrigePorEmpates() {
        // [1, 1, 2] y [2, 3, 3] → H = 3.3333 con corrección por empates
        long[][] tabla = {{2, 1, 0}, {0, 1, 2}};
        assertThat(PruebaAsociacionService.hKruskalWallis(tabla)).isCloseTo(3.3333, within(1e-4));
    }

    @Test
    void nominalPorNominalDelegaEnLaSeleccionPorFrecuencias() {
        long[][] tabla = {{30, 10}, {12, 28}};
        ResultadoAsociacion r = service.analizar(tabla, Level.NOMINAL, Level.BINARIA, 0.05);
        assertThat(r.codigo()).isEqualTo("CHI_CUADRADO");
        assertThat(r.efectoNombre()).isEqualTo("φ (phi)");
        assertThat(r.descartadas()).isNotEmpty();

        long[][] chica = {{6, 1}, {1, 5}};
        assertThat(service.analizar(chica, Level.BINARIA, Level.BINARIA, 0.05).codigo()).isEqualTo("FISHER_EXACTA");
    }

    @Test
    void muestraMenorADiezNoEsAplicable() {
        ResultadoAsociacion r = service.analizar(new long[][]{{2, 1}, {1, 3}}, Level.ORDINAL, Level.ORDINAL, 0.05);
        assertThat(r.aplicable()).isFalse();
        assertThat(r.codigo()).isEqualTo("NO_APLICABLE");
    }

    @Test
    void lasCategoriasVaciasNoCuentan() {
        long[][] tabla = {{5, 0, 5}, {0, 0, 0}, {5, 0, 5}};
        assertThat(PruebaAsociacionService.sinMarginalesVacias(tabla)).isDeepEqualTo(new long[][]{{5, 5}, {5, 5}});
    }

    @Test
    void magnitudesSiguenLosUmbralesConvencionales() {
        assertThat(PruebaAsociacionService.magnitudCorrelacion(-0.05)).isEqualTo("Despreciable");
        assertThat(PruebaAsociacionService.magnitudCorrelacion(0.35)).isEqualTo("Moderada");
        assertThat(PruebaAsociacionService.magnitudCorrelacion(-0.6)).isEqualTo("Grande");
        assertThat(PruebaAsociacionService.magnitudEpsilon(0.1)).isEqualTo("Moderada");
        assertThat(PruebaAsociacionService.magnitudCramer(0.2, 1)).isEqualTo("Pequeña");
        assertThat(PruebaAsociacionService.magnitudCramer(0.25, 2)).isEqualTo("Moderada");
    }
}
