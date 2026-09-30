package com.simulacionem.analitica;

import com.simulacionem.analitica.domain.model.ResultadoChiCuadrado;
import com.simulacionem.analitica.domain.model.TablaContingencia;
import com.simulacionem.analitica.infrastructure.math.CommonsChiSquareAdapter;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

class CommonsChiSquareAdapterTest {

    private final CommonsChiSquareAdapter adapter = new CommonsChiSquareAdapter();

    @Test
    void detectaDependenciaEnTablaFuertementeAsociada() {
        ResultadoChiCuadrado r = adapter.evaluar(new TablaContingencia(new long[][]{{50, 10}, {10, 50}}), 0.05);

        assertThat(r.gradosLibertad()).isEqualTo(1);
        assertThat(r.estadistico()).isCloseTo(53.333, within(0.001));
        assertThat(r.rechazaIndependencia()).isTrue();
    }

    @Test
    void noRechazaIndependenciaEnTablaProporcional() {
        ResultadoChiCuadrado r = adapter.evaluar(new TablaContingencia(new long[][]{{20, 40}, {10, 20}}), 0.05);

        assertThat(r.estadistico()).isCloseTo(0.0, within(1e-9));
        assertThat(r.rechazaIndependencia()).isFalse();
    }
}
