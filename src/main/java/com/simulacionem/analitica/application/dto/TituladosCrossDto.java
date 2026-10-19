package com.simulacionem.analitica.application.dto;

import com.simulacionem.analitica.application.service.PruebaAsociacionService.ResultadoAsociacion;

/** Cruce analítico de titulados con el metadato que permite seleccionar e interpretar la prueba estadística. */
public record TituladosCrossDto(CrossTabulationDto cross, EmployerCrossDto.VariableDto row,
                                EmployerCrossDto.VariableDto column, long excluded, String chart,
                                ResultadoAsociacion test) { }
