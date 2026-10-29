package com.simulacionem.analitica.application.service;

import com.simulacionem.analitica.application.dto.CrossTabulationDto;
import com.simulacionem.analitica.application.dto.TituladosCrossDto;
import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** Verifica que los cruces de Titulados llegan al selector inferencial con la escala correcta. */
class TituladosCrossServiceTest {

    private final UUID datasetId = UUID.randomUUID();
    private final AnalyticsService analytics = mock(AnalyticsService.class);
    private final TituladosCrossService service = new TituladosCrossService(analytics,
            new PruebaAsociacionService(new SeleccionPruebaEstadisticaService()));

    @Test
    void seleccionaLaPruebaSegunLasVariablesDeTitulados() {
        assertThat(analyze("edad_rango", "remuneracion_rango", ordinalByOrdinal()).test().codigo()).isEqualTo("SPEARMAN");
        assertThat(analyze("genero", "remuneracion_rango", binaryByOrdinal()).test().codigo()).isEqualTo("MANN_WHITNEY");
        assertThat(analyze("situacion_laboral_actual", "remuneracion_rango", nominalByOrdinal()).test().codigo()).isEqualTo("KRUSKAL_WALLIS");
        assertThat(analyze("situacion_laboral_actual", "interes_posgrado", nominalByNominal()).test().codigo()).isEqualTo("CHI_CUADRADO");
    }

    @Test
    void reordenaLaEscalaSalarialAntesDeCalcularSpearman() {
        TituladosCrossDto result = analyze("edad_rango", "remuneracion_rango", ordinalByOrdinal());

        assertThat(result.cross().columnCategories()).containsExactly(
                "Menos de Bs. 2.500", "Bs. 2.500 - 3.500", "Más de Bs. 10.000");
        assertThat(result.test().efecto()).isPositive();
        assertThat(result.excluded()).isEqualTo(4);
    }

    /**
     * Regresión H-01 / TIT-018: el orden ordinal sale de la escala, no del alfabeto. Edad y valoración global
     * crecen juntas (30 respuestas, ρ = 1); «Totalmente de Acuerdo» con mayúscula pertenece a la escala y una
     * categoría ajena a ella queda fuera del cruce y se cuenta como excluida.
     */
    @Test
    void usaLaEscalaOrdinalYExcluyeCategoriasAjenas() {
        CrossTabulationDto source = cross("edad_rango", "satisfaccion_formacion",
                List.of("27 - 30 años", "19 - 22 años", "23 - 26 años"),
                List.of("De acuerdo", "Totalmente de Acuerdo", "En desacuerdo", "Algo satisfecho"),
                new long[][]{{0, 10, 0, 2}, {0, 0, 10, 1}, {10, 0, 0, 0}});

        TituladosCrossDto result = analyze("edad_rango", "satisfaccion_formacion", source);

        assertThat(result.cross().rowCategories()).containsExactly("19 - 22 años", "23 - 26 años", "27 - 30 años");
        assertThat(result.cross().columnCategories()).containsExactly("En desacuerdo", "De acuerdo", "Totalmente de Acuerdo");
        assertThat(result.cross().validCount()).isEqualTo(30);
        assertThat(result.excluded()).isEqualTo(3 + 4);
        assertThat(result.test().codigo()).isEqualTo("SPEARMAN");
        assertThat(result.test().efecto()).isEqualTo(1.0);
    }

    private TituladosCrossDto analyze(String row, String column, CrossTabulationDto cross) {
        when(analytics.crossForAnalysis(eq(datasetId), eq(row), eq(column), any()))
                .thenReturn(new AnalyticsService.CrossAnalysisScope(cross, cross.validCount() + 4));
        return service.cross(datasetId, TituladosFilter.none(), row, column);
    }

    private CrossTabulationDto ordinalByOrdinal() {
        return cross("edad_rango", "remuneracion_rango",
                List.of("27 - 30 años", "19 - 22 años", "23 - 26 años"),
                List.of("Más de Bs. 10.000", "Menos de Bs. 2.500", "Bs. 2.500 - 3.500"),
                new long[][]{{8, 0, 1}, {0, 8, 1}, {1, 0, 8}});
    }

    private CrossTabulationDto binaryByOrdinal() {
        return cross("genero", "remuneracion_rango", List.of("Mujer", "Hombre"),
                List.of("Menos de Bs. 2.500", "Bs. 2.500 - 3.500", "Más de Bs. 10.000"),
                new long[][]{{8, 4, 1}, {1, 4, 8}});
    }

    private CrossTabulationDto nominalByOrdinal() {
        return cross("situacion_laboral_actual", "remuneracion_rango",
                List.of("Trabaja en una organización", "Emprendimiento propio", "En búsqueda laboral"),
                List.of("Menos de Bs. 2.500", "Bs. 2.500 - 3.500", "Más de Bs. 10.000"),
                new long[][]{{1, 3, 8}, {3, 8, 2}, {8, 2, 1}});
    }

    private CrossTabulationDto nominalByNominal() {
        return cross("situacion_laboral_actual", "interes_posgrado",
                List.of("Trabaja en una organización", "Emprendimiento propio", "En búsqueda laboral"), List.of("Sí", "No"),
                new long[][]{{22, 8}, {8, 22}, {18, 12}});
    }

    private CrossTabulationDto cross(String rowField, String columnField, List<String> rows, List<String> columns, long[][] values) {
        Map<String, Map<String, Long>> counts = new LinkedHashMap<>();
        Map<String, Map<String, Double>> percentages = new LinkedHashMap<>();
        long total = 0;
        for (int i = 0; i < rows.size(); i++) {
            Map<String, Long> row = new LinkedHashMap<>();
            long rowTotal = 0;
            for (int j = 0; j < columns.size(); j++) {
                row.put(columns.get(j), values[i][j]);
                rowTotal += values[i][j];
            }
            total += rowTotal;
            counts.put(rows.get(i), row);
            Map<String, Double> percentagesByColumn = new LinkedHashMap<>();
            for (String column : columns) percentagesByColumn.put(column, row.get(column) * 100.0 / rowTotal);
            percentages.put(rows.get(i), percentagesByColumn);
        }
        return new CrossTabulationDto(datasetId, rowField, columnField, total, rows, columns, counts, percentages, false);
    }

}
