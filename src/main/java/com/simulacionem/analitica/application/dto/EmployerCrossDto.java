package com.simulacionem.analitica.application.dto;

import com.simulacionem.analitica.application.service.PruebaAsociacionService.ResultadoAsociacion;

import java.util.List;

/**
 * Cruce de dos variables de empleadores: la tabla de contingencia, la descripción de cada variable,
 * las respuestas excluidas por no tener ambas variables y la prueba elegida según el nivel de medición.
 *
 * @param excluded respuestas del alcance filtrado sin alguna de las dos variables (sin respuesta, «No sabe»,
 *                 «No observado» o una categoría fuera de la escala)
 * @param chart    gráfico recomendado para el par de variables
 */
public record EmployerCrossDto(CrossTabulationDto cross, VariableDto row, VariableDto column, long excluded,
                               String chart, ResultadoAsociacion test,
                               List<OptionAssociationDto> optionTests) {

    public record OptionAssociationDto(String option, ResultadoAsociacion test, Double holmPValue,
                                        boolean significantAfterCorrection) { }

    /** Variable del catálogo, tal como se expone al frontend. */
    public record VariableDto(String key, String label, String group, String level, List<String> categories,
                              String chart, String description) { }
}
