package com.simulacionem.analitica.domain.model;

import java.util.Arrays;

public record TablaContingencia(long[][] frecuencias) {

    public TablaContingencia {
        if (frecuencias == null || frecuencias.length < 2 || frecuencias[0].length < 2) {
            throw new IllegalArgumentException("La tabla de contingencia requiere al menos 2x2");
        }
        int columnas = frecuencias[0].length;
        for (long[] fila : frecuencias) {
            if (fila.length != columnas) {
                throw new IllegalArgumentException("Todas las filas deben tener el mismo número de columnas");
            }
            if (Arrays.stream(fila).anyMatch(f -> f < 0)) {
                throw new IllegalArgumentException("Las frecuencias no pueden ser negativas");
            }
        }
        frecuencias = Arrays.stream(frecuencias).map(long[]::clone).toArray(long[][]::new);
    }

    public int gradosLibertad() {
        return (frecuencias.length - 1) * (frecuencias[0].length - 1);
    }
}
