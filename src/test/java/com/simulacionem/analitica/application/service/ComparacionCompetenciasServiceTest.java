package com.simulacionem.analitica.application.service;

import com.simulacionem.analitica.application.dto.CompetenceComparisonDto.Competencia;
import com.simulacionem.analitica.application.dto.CompetenceComparisonDto.Grupo;
import com.simulacionem.analitica.application.dto.CompetenceComparisonDto.Prueba;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ComparacionCompetenciasServiceTest {

    @Test
    void mannWhitneyDetectaQueLosEmpleadoresValoranMasAlto() {
        int[] titulados = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10};
        int[] empleadores = {11, 12, 13, 14, 15, 16, 17, 18, 19, 20};

        Prueba prueba = ComparacionCompetenciasService.mannWhitney(titulados, empleadores);

        assertEquals("MANN_WHITNEY", prueba.codigo());
        assertEquals(100.0, prueba.u());
        assertEquals(1.0, prueba.rBiserial());
        // z = (|100 − 50| − 0,5) / √(10·10·21/12)
        assertEquals(49.5 / Math.sqrt(175.0), prueba.z(), 1e-4);
        assertEquals(0.000183, prueba.pValor(), 1e-5);
    }

    @Test
    void mannWhitneyConDistribucionesIgualesNoEncuentraDiferencia() {
        int[] grupo = {1, 2, 3, 4, 5, 1, 2, 3, 4, 5};

        Prueba prueba = ComparacionCompetenciasService.mannWhitney(grupo, grupo.clone());

        assertEquals(50.0, prueba.u());
        assertEquals(0.0, prueba.rBiserial());
        assertEquals(1.0, prueba.pValor(), 1e-9);
    }

    @Test
    void mannWhitneyUsaPermutacionConMuestrasChicas() {
        int[] titulados = {5, 5, 4, 5, 4, 5};
        int[] empleadores = {2, 3, 2, 1, 3, 2};

        Prueba prueba = ComparacionCompetenciasService.mannWhitney(titulados, empleadores);

        assertEquals("MANN_WHITNEY_PERMUTACION", prueba.codigo());
        assertEquals(-1.0, prueba.rBiserial());
        assertTrue(prueba.pValor() < 0.01);
    }

    @Test
    void mannWhitneyNoAplicaConMenosDeCincoPorGrupo() {
        Prueba prueba = ComparacionCompetenciasService.mannWhitney(new int[] {4, 5, 3, 4, 5}, new int[] {2, 3});

        assertFalse(prueba.aplicable());
        assertEquals("NO_APLICABLE", prueba.codigo());
    }

    @Test
    void rangosPromedioRepartenLosEmpates() {
        double[] rangos = ComparacionCompetenciasService.rangosPromedio(new double[] {3, 1, 3, 2});

        assertArrayEquals(new double[] {3.5, 1.0, 3.5, 2.0}, rangos);
    }

    @Test
    void holmAjustaLosPValoresDeFormaMonotona() {
        List<Competencia> filas = List.of(fila("a", 0.01), fila("b", 0.04), fila("c", 0.03));

        List<Competencia> ajustadas = ComparacionCompetenciasService.ajustarHolm(filas, 0.05);

        assertEquals(0.03, ajustadas.get(0).prueba().pAjustado(), 1e-9);
        assertEquals(0.06, ajustadas.get(1).prueba().pAjustado(), 1e-9);
        assertEquals(0.06, ajustadas.get(2).prueba().pAjustado(), 1e-9);
        assertTrue(ajustadas.get(0).prueba().significativa());
        assertFalse(ajustadas.get(1).prueba().significativa());
    }

    private static Competencia fila(String code, double p) {
        Grupo grupo = new Grupo(10, 3.0, 3.0, 1.0, Map.of(), 0);
        Prueba prueba = new Prueba("MANN_WHITNEY", "U de Mann-Whitney", true, 50.0, 0.0, p, null, false, 0.0, "");
        return new Competencia(code, code, "HARD_SKILL", grupo, grupo, 0.0, 0.0, prueba);
    }
}
