package com.simulacionem.analitica.domain.model;

public record ResultadoChiCuadrado(
        double estadistico,
        int gradosLibertad,
        double pValor,
        double alfa,
        boolean rechazaIndependencia) {
}
