package com.simulacionem.analitica.application.service;

import com.simulacionem.analitica.application.dto.ExploratoryDto;
import com.simulacionem.analitica.application.dto.ExploratoryDto.Cell;
import com.simulacionem.analitica.application.dto.ExploratoryDto.Summary;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.within;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Controles VE1–VE3 y VE6 del análisis exploratorio, con el ejemplo sintético de la propuesta metodológica:
 * ocho registros cuyo resultado se calculó a mano (media 4 y s = √8 en organización/sí; global 3,4 y √5,8).
 */
class AnalisisExploratorioServiceTest {

    private static final UUID DATASET = UUID.randomUUID();
    private static final String X = "situacion_laboral_actual";
    private static final String Y = "interes_posgrado";
    private static final String Z = "anios_vida_profesional";
    private static final String ORG = "Trabaja en una organización";
    private static final String BUSQ = "En búsqueda laboral";
    private static final String EMP = "Emprendimiento propio";

    private final AnalyticsService analytics = mock(AnalyticsService.class);
    private final AnalisisExploratorioService service = new AnalisisExploratorioService(analytics);

    /** Registros del ejemplo: el 7 no tiene X; el 3 tiene Z vacía y el 8 Z con texto; el cero del 4 es válido. */
    private static List<AnalyticsService.ExploratoryRow> ejemplo() {
        return List.of(
                row(ORG, "Sí", "2.0", "2"), row(ORG, "Sí", "6.0", "6"), row(ORG, "Sí", null, null),
                row(BUSQ, "No", "0.0", "0"), row(BUSQ, "No", "4.0", "4"), row(EMP, "Sí", "5.0", "5"),
                row(null, "Sí", "7.0", "7"), row(ORG, "No", null, "Texto inválido"));
    }

    private static AnalyticsService.ExploratoryRow row(String x, String y, String z, String raw) {
        return new AnalyticsService.ExploratoryRow(x, true, y, true, z, true, raw);
    }

    private ExploratoryDto analizar(List<AnalyticsService.ExploratoryRow> rows) {
        when(analytics.exploratoryRows(eq(DATASET), any(), eq(X), eq(Y), eq(Z)))
                .thenReturn(new AnalyticsService.ExploratoryRows(DATASET, rows.size(), rows.size(), rows, Set.of(X, Y, Z)));
        return service.analizar(DATASET, TituladosFilter.none(), X, Y, Z);
    }

    private static Summary cell(ExploratoryDto dto, String row, String column) {
        return dto.cells().stream().filter(c -> c.row().equals(row) && c.column().equals(column))
                .map(Cell::summary).findFirst().orElseThrow();
    }

    @Test
    void ve1ReproduceElEjemploSinteticoCompleto() {
        ExploratoryDto dto = analizar(ejemplo());

        assertThat(dto.status()).isEqualTo(ExploratoryDto.OK);
        assertThat(dto.rowCategories()).containsExactly(ORG, EMP, BUSQ);
        assertThat(dto.columnCategories()).containsExactly("Sí", "No");
        assertThat(dto.cells()).hasSize(6);

        Summary orgSi = cell(dto, ORG, "Sí");
        assertThat(orgSi.n()).isEqualTo(3);
        assertThat(orgSi.m()).isEqualTo(2);
        assertThat(orgSi.coverage()).isCloseTo(66.6667, within(1e-4));
        assertThat(orgSi.mean()).isEqualTo(4.0);
        assertThat(orgSi.median()).isEqualTo(4.0);
        assertThat(orgSi.standardDeviation()).isCloseTo(Math.sqrt(8), within(1e-12));
        assertThat(orgSi.state()).isEqualTo("COMPLETO");

        Summary orgNo = cell(dto, ORG, "No");
        assertThat(orgNo.n()).isEqualTo(1);
        assertThat(orgNo.m()).isZero();
        assertThat(orgNo.coverage()).isZero();
        assertThat(orgNo.mean()).isNull();
        assertThat(orgNo.state()).isEqualTo("SIN_MEDIDA");

        Summary busqNo = cell(dto, BUSQ, "No");
        assertThat(busqNo.mean()).isEqualTo(2.0);
        assertThat(busqNo.standardDeviation()).isCloseTo(Math.sqrt(8), within(1e-12));

        Summary empSi = cell(dto, EMP, "Sí");
        assertThat(empSi.mean()).isEqualTo(5.0);
        assertThat(empSi.standardDeviation()).as("con un solo dato no hay desviación muestral").isNull();
        assertThat(empSi.state()).isEqualTo("UNA_MEDIDA");

        for (Summary empty : List.of(cell(dto, BUSQ, "Sí"), cell(dto, EMP, "No"))) {
            assertThat(empty.n()).isZero();
            assertThat(empty.coverage()).isNull();
            assertThat(empty.state()).isEqualTo("SIN_OBSERVACIONES");
        }

        Summary global = dto.global();
        assertThat(global.n()).isEqualTo(7);
        assertThat(global.m()).isEqualTo(5);
        assertThat(global.coverage()).isCloseTo(71.4286, within(1e-4));
        assertThat(global.mean()).isCloseTo(3.4, within(1e-12));
        assertThat(global.median()).isEqualTo(4.0);
        assertThat(global.standardDeviation()).isCloseTo(Math.sqrt(5.8), within(1e-12));
        assertThat(dto.bases().nXY()).isEqualTo(7);
        assertThat(dto.bases().nZ()).isEqualTo(5);
    }

    @Test
    void ve2ConservaElCeroYSeparaVacioDeTexto() {
        ExploratoryDto dto = analizar(ejemplo());

        assertThat(cell(dto, BUSQ, "No").min()).as("el cero es una respuesta válida").isZero();
        assertThat(dto.bases().exclusions()).extracting(ExploratoryDto.Exclusion::reason)
                .anyMatch(reason -> reason.startsWith("Sin respuesta en «Estado laboral»"))
                .anyMatch(reason -> reason.contains("vacía"))
                .anyMatch(reason -> reason.contains("texto no numérico"));
        assertThat(dto.bases().exclusions()).allMatch(exclusion -> exclusion.count() == 1);
    }

    @Test
    void ve3DistinguePreguntaAusenteDeBaseVacia() {
        when(analytics.exploratoryRows(eq(DATASET), any(), eq(X), eq(Y), eq(Z)))
                .thenReturn(new AnalyticsService.ExploratoryRows(DATASET, 8, 8, ejemplo(), Set.of(X, Z)));
        ExploratoryDto ausente = service.analizar(DATASET, TituladosFilter.none(), X, Y, Z);
        assertThat(ausente.status()).isEqualTo(ExploratoryDto.PREGUNTA_AUSENTE);
        assertThat(ausente.warnings()).singleElement().asString().contains("«Interés en posgrado»");
        assertThat(ausente.global().mean()).as("sin medias aparentes").isNull();

        ExploratoryDto vacia = analizar(List.of());
        assertThat(vacia.status()).isEqualTo(ExploratoryDto.BASE_VACIA);
        assertThat(vacia.cells()).isEmpty();
        assertThat(vacia.global().n()).isZero();
    }

    @Test
    void ve6ElOrdenDeLosRegistrosNoCambiaElResultado() {
        List<AnalyticsService.ExploratoryRow> shuffled = new ArrayList<>(ejemplo());
        Collections.reverse(shuffled);
        Collections.swap(shuffled, 1, 5);

        assertThat(analizar(shuffled)).usingRecursiveComparison().isEqualTo(analizar(ejemplo()));
    }

    @Test
    void elTotalPonderadoSaleDeLosRegistrosNoDePromediarCeldas() {
        ExploratoryDto dto = analizar(ejemplo());
        double ponderada = dto.cells().stream().map(Cell::summary).filter(s -> s.m() > 0)
                .mapToDouble(s -> s.m() * s.mean()).sum() / dto.global().m();
        double promedioDeMedias = dto.cells().stream().map(Cell::summary).filter(s -> s.m() > 0)
                .mapToDouble(Summary::mean).average().orElseThrow();

        assertThat(dto.global().mean()).isCloseTo(ponderada, within(1e-12));
        assertThat(dto.global().mean()).isNotCloseTo(promedioDeMedias, within(1e-6));
    }

    @Test
    void rechazaPromediarEscalasOrdinalesYVariablesRepetidas() {
        assertThatThrownBy(() -> service.analizar(DATASET, TituladosFilter.none(), X, Y, "remuneracion_rango"))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("no se promedian");
        assertThatThrownBy(() -> service.analizar(DATASET, TituladosFilter.none(), X, X, Z))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void unaRespuestaMultipleNoSeCuentaDosVeces() {
        String area = "area_posgrado_interes";
        List<AnalyticsService.ExploratoryRow> rows = List.of(
                new AnalyticsService.ExploratoryRow("Inteligencia artificial", true, "Sí", true, "3.0", true, "3"),
                new AnalyticsService.ExploratoryRow("Inteligencia artificial; Robótica", true, "Sí", true, "8.0", true, "8"));
        when(analytics.exploratoryRows(eq(DATASET), any(), eq(area), eq(Y), eq(Z)))
                .thenReturn(new AnalyticsService.ExploratoryRows(DATASET, 2, 2, rows, Set.of(area, Y, Z)));

        ExploratoryDto dto = service.analizar(DATASET, TituladosFilter.none(), area, Y, Z);

        assertThat(dto.global().n()).isEqualTo(1);
        assertThat(dto.warnings()).anyMatch(w -> w.contains("más de una opción"));
    }
}
