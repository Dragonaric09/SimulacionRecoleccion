package com.simulacionem.analitica.application.dto;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Cruce titulados × empleadores por competencia. Ambas encuestas usan la misma escala 1–5
 * (1 = Muy insuficiente, 5 = Muy suficiente): los titulados valoran qué tan preparados los dejó la Carrera y los
 * empleadores el nivel que demuestran los titulados. «No observado» se excluye de los estadísticos.
 */
public record CompetenceComparisonDto(UUID tituladosDatasetId, String tituladosDataset,
                                      UUID empleadoresDatasetId, String empleadoresDataset,
                                      double alfa, String ajusteMultiple,
                                      List<Competencia> competencias) {

    /**
     * @param diferenciaMedias empleadores − titulados (negativo: los empleadores valoran por debajo de la
     *                         autopercepción de los titulados)
     */
    public record Competencia(String code, String name, String group, Grupo titulados, Grupo empleadores,
                              Double diferenciaMedias, Double diferenciaMedianas, Prueba prueba) { }

    public record Grupo(long n, Double media, Double mediana, Double desviacion,
                        Map<Integer, Long> niveles, long noObservado) { }

    /**
     * @param u         U de Mann-Whitney del grupo empleadores
     * @param z         estadístico normal con corrección por empates (null si se usó permutación)
     * @param pAjustado p-valor corregido por comparaciones múltiples (Holm); la decisión usa este valor
     * @param rBiserial correlación biserial por rangos: + empleadores valoran más alto, − más bajo
     */
    public record Prueba(String codigo, String nombre, boolean aplicable, Double u, Double z, Double pValor,
                         Double pAjustado, boolean significativa, Double rBiserial, String motivo) { }
}
