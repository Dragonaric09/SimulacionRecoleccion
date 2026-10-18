package com.simulacionem.analitica.application.dto;

import com.simulacionem.analitica.application.service.PruebaAsociacionService.ResultadoAsociacion;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Valoración de la Carrera por los empleadores, resumida en dimensiones.
 *
 * Puntaje 0–100 de una afirmación: «Totalmente de acuerdo» = 100, «Parcialmente de acuerdo» = 50,
 * «Totalmente desacuerdo» = 0; «No sabe» y las respuestas vacías no entran en el puntaje y se informan aparte.
 * El puntaje de una dimensión para una organización es el promedio de sus afirmaciones respondidas.
 */
public record EmployerValuationDto(UUID datasetId, Summary summary, List<Dimension> dimensions, List<Item> items,
                                   List<Segment> segments, KnowledgeMatrix knowledge, Correlations correlations) {

    /**
     * @param totalResponses   respuestas válidas del dataset, sin filtros
     * @param uniformResponses organizaciones que marcaron la misma opción en las 18 afirmaciones
     */
    public record Summary(long totalResponses, long respondents, Double score, Double fullAgreementShare, Double disagreementShare,
                          Double unknownShare, long uniformResponses, String strongestDimension, String weakestDimension) { }

    /** Distribución de una dimensión sobre todas sus respuestas (organización × afirmación). */
    public record Dimension(String key, String label, String description, List<String> itemKeys,
                            Double score, Double fullAgreementShare, Double partialShare, Double disagreementShare,
                            Double unknownShare, long answered, long respondents) { }

    public record Item(int position, String key, String label, String dimension,
                       long full, long partial, long disagreement, long unknown, long missing,
                       Double score, Double netIndex) { }

    /** Puntaje por dimensión en cada grupo de una variable de segmentación, con la prueba sobre el puntaje global. */
    public record Segment(String variable, String label, String level, List<SegmentGroup> groups, ResultadoAsociacion test) { }

    public record SegmentGroup(String category, long n, Double score, Map<String, Double> dimensions) { }

    /** Conocimiento del perfil de egreso (f4) frente a coherencia perfil–desempeño (f5). */
    public record KnowledgeMatrix(List<String> categories, long[][] counts, long excluded, ResultadoAsociacion test) { }

    /** ρ de Spearman entre los puntajes de las dimensiones (organizaciones con ambas dimensiones respondidas). */
    public record Correlations(List<String> keys, List<String> labels, Double[][] rho, Double[][] pValues, long[][] n) { }
}
