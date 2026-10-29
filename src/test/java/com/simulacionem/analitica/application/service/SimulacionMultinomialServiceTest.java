package com.simulacionem.analitica.application.service;

import com.simulacionem.analitica.application.service.SimulacionMultinomialService.CategoryDifference;
import com.simulacionem.analitica.application.service.SimulacionMultinomialService.ComparisonRequest;
import com.simulacionem.analitica.application.service.SimulacionMultinomialService.ScenarioComparison;
import com.simulacionem.analitica.application.service.SimulacionMultinomialService.SimulationCategory;
import com.simulacionem.analitica.application.service.SimulacionMultinomialService.SimulationRequest;
import com.simulacionem.analitica.application.service.SimulacionMultinomialService.SimulationResult;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.within;

class SimulacionMultinomialServiceTest {

    private final SimulacionMultinomialService service = new SimulacionMultinomialService();
    private static final List<String> CATEGORIES = List.of("Trabaja", "Busca", "Estudia");

    /** D-04: el rango del 95 % son los percentiles 2,5 y 97,5 de las réplicas, no media ± 1,96 desviaciones. */
    @Test
    void elRangoDel95SonLosPercentilesDeLasReplicas() {
        SimulationResult result = service.simular(new SimulationRequest(CATEGORIES, List.of(0.6, 0.3, 0.1),
                List.of(60L, 30L, 10L), 50, 400, 7));

        for (SimulationCategory category : result.categories()) {
            double[] sorted = category.replicaPercentages().stream().mapToDouble(Double::doubleValue).sorted().toArray();
            assertThat(category.lower95()).isEqualTo(round(SimulacionMultinomialService.percentile(sorted, 0.025)));
            assertThat(category.upper95()).isEqualTo(round(SimulacionMultinomialService.percentile(sorted, 0.975)));
            long inside = Arrays.stream(sorted).filter(value -> value >= category.lower95() && value <= category.upper95()).count();
            assertThat(inside).isGreaterThanOrEqualTo(Math.round(sorted.length * 0.95));
            // El rango sale de valores realmente simulados: nunca baja de 0 ni pasa de 100 por construcción.
            assertThat(category.lower95()).isGreaterThanOrEqualTo(sorted[0]);
            assertThat(category.upper95()).isLessThanOrEqualTo(sorted[sorted.length - 1]);
        }
    }

    /** Con una categoría rara la fórmula normal daba un límite inferior recortado a 0; los percentiles no. */
    @Test
    void elRangoEsAsimetricoEnCategoriasRaras() {
        SimulationCategory rare = service.simular(new SimulationRequest(List.of("Común", "Rara"), List.of(0.98, 0.02),
                null, 100, 2000, 11)).categories().get(1);

        assertThat(rare.upper95() - rare.simulatedMean()).isGreaterThan(rare.simulatedMean() - rare.lower95());
    }

    @Test
    void percentilUsaInterpolacionInclusiva() {
        double[] values = {1, 2, 3, 4};
        assertThat(SimulacionMultinomialService.percentile(values, 0.5)).isEqualTo(2.5);
        assertThat(SimulacionMultinomialService.percentile(values, 0.025)).isCloseTo(1.075, within(1e-9));
        assertThat(SimulacionMultinomialService.percentile(values, 1)).isEqualTo(4);
    }

    @Test
    void laMismaSemillaReproduceLaSimulacion() {
        SimulationRequest request = new SimulationRequest(CATEGORIES, List.of(0.5, 0.25, 0.25), null, 30, 50, 99);
        assertThat(service.simular(request)).isEqualTo(service.simular(request));
    }

    /** Números aleatorios comunes: un escenario igual al base no tiene diferencia en ninguna réplica. */
    @Test
    void unEscenarioIgualAlBaseNoTieneDiferencia() {
        List<Double> probabilities = List.of(0.5, 0.3, 0.2);
        ScenarioComparison comparison = service.comparar(new ComparisonRequest(CATEGORIES, probabilities, probabilities,
                List.of(50L, 30L, 20L), 100, 300, 5));

        assertThat(comparison.differences()).allSatisfy(difference -> {
            assertThat(difference.meanDifference()).isZero();
            assertThat(difference.lower95()).isZero();
            assertThat(difference.upper95()).isZero();
            assertThat(difference.shareHigher()).isZero();
            assertThat(difference.shareLower()).isZero();
        });
    }

    @Test
    void laComparacionEmparejaLasReplicasDeAmbosEscenarios() {
        ComparisonRequest request = new ComparisonRequest(CATEGORIES, List.of(0.5, 0.3, 0.2), List.of(0.6, 0.2, 0.2),
                List.of(50L, 30L, 20L), 100, 500, 21);
        ScenarioComparison comparison = service.comparar(request);

        // Cada lado coincide con la simulación individual de la misma semilla.
        assertThat(comparison.base()).isEqualTo(service.simular(new SimulationRequest(CATEGORIES, request.baseProbabilities(),
                request.observedCounts(), 100, 500, 21)));
        assertThat(comparison.scenario()).isEqualTo(service.simular(new SimulationRequest(CATEGORIES, request.scenarioProbabilities(),
                request.observedCounts(), 100, 500, 21)));

        CategoryDifference trabaja = comparison.differences().get(0);
        assertThat(trabaja.meanDifference()).isCloseTo(
                comparison.scenario().categories().get(0).simulatedMean() - comparison.base().categories().get(0).simulatedMean(),
                within(0.011));
        // Con los mismos sorteos, mover la frontera acumulada hacia arriba nunca resta casos a la primera categoría.
        assertThat(trabaja.shareLower()).isZero();
        assertThat(trabaja.shareHigher()).isGreaterThan(95);
        assertThat(trabaja.lower95()).isPositive();
        // La tercera categoría conserva su probabilidad y su intervalo acumulado (0,8–1,0): no cambia en ninguna réplica.
        CategoryDifference estudia = comparison.differences().get(2);
        assertThat(estudia.meanDifference()).isZero();
        assertThat(estudia.shareHigher() + estudia.shareLower()).isZero();
    }

    @Test
    void rechazaEntradasInvalidas() {
        assertThatThrownBy(() -> service.simular(new SimulationRequest(CATEGORIES, List.of(0.5, 0.5, 0.5), null, 10, 10, 1)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.simular(new SimulationRequest(CATEGORIES, List.of(0.5, 0.5, 0.0), null, 10_001, 10, 1)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.comparar(new ComparisonRequest(CATEGORIES, List.of(0.5, 0.5, 0.0), List.of(0.5, 0.5),
                null, 10, 10, 1))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.simular(new SimulationRequest(CATEGORIES, Arrays.asList(0.5, null, 0.5), null, 10, 10, 1)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void validaLosEscenariosGuardados() {
        EscenarioSimulacionService.ScenarioRequest valid = new EscenarioSimulacionService.ScenarioRequest(
                "  Más   empleo ", " ", "situacion_laboral_actual", null, CATEGORIES, List.of(0.6, 0.3, 0.1), 100, 1000, 42, null);
        EscenarioSimulacionService.ScenarioRequest normalized = EscenarioSimulacionService.validate(valid);
        assertThat(normalized.name()).isEqualTo("Más empleo");
        assertThat(normalized.description()).isNull();
        assertThat(normalized.segment()).isEqualTo("all");

        assertThatThrownBy(() -> EscenarioSimulacionService.validate(new EscenarioSimulacionService.ScenarioRequest(
                "x", null, "area_posgrado_interes", "all", CATEGORIES, List.of(0.6, 0.3, 0.1), 100, 1000, 42, null)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> EscenarioSimulacionService.validate(new EscenarioSimulacionService.ScenarioRequest(
                "x", null, "genero", "all", List.of("Mujer", "Mujer"), List.of(0.5, 0.5), 100, 1000, 42, null)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> EscenarioSimulacionService.validate(new EscenarioSimulacionService.ScenarioRequest(
                "", null, "genero", "all", List.of("Mujer", "Hombre"), List.of(0.5, 0.5), 100, 1000, 42, null)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    private static double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
