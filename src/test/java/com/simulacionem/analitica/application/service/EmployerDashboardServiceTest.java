package com.simulacionem.analitica.application.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class EmployerDashboardServiceTest {

    @Test
    void elIndiceNetoExcluyeNoSabeYVaDeMenosCienACien() {
        // 2 de acuerdo, 1 parcial, 1 en desacuerdo: (2 - 1) / 4 = 25 puntos. «No sabe» no entra en el denominador.
        assertThat(EmployerDashboardService.netIndex(2, 1, 1)).isEqualTo(25.0);
        assertThat(EmployerDashboardService.netIndex(0, 0, 3)).isEqualTo(-100.0);
        assertThat(EmployerDashboardService.netIndex(3, 0, 0)).isEqualTo(100.0);
    }

    @Test
    void sinRespuestasDeEscalaElIndiceNoEsCero() {
        assertThat(EmployerDashboardService.netIndex(0, 0, 0)).isNull();
    }

    @Test
    void unaVariacionSinBaseSuficienteNoSeCalcula() {
        assertThat(EmployerDashboardService.pointChange(50.0, 40.0, 4, 10)).isNull();
        assertThat(EmployerDashboardService.pointChange(50.0, 40.0, 10, 4)).isNull();
        assertThat(EmployerDashboardService.pointChange(null, 40.0, 10, 10)).isNull();
    }

    @Test
    void laVariacionEsLaDiferenciaEnPuntosCuandoHayBase() {
        assertThat(EmployerDashboardService.pointChange(50.0, 40.0, 10, 10)).isEqualTo(10.0);
        assertThat(EmployerDashboardService.pointChange(2.5, 3.25, 5, 5)).isEqualTo(-0.75);
    }

    @Test
    void elPorcentajeSinBaseEsNulo() {
        assertThat(EmployerDashboardService.percent(1, 0)).isNull();
        assertThat(EmployerDashboardService.percent(1, 4)).isEqualTo(25.0);
    }
}
