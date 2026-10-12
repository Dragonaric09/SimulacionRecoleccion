package com.simulacionem.analitica.application.dto;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Agregados del dashboard de empleadores. Todo se calcula en la base de datos: el tamaño de la respuesta
 * depende del número de categorías, no del número de respuestas.
 */
public record EmployerDashboardDto(
        UUID datasetId,
        long totalResponses,
        long filteredResponses,
        boolean smallSample,
        OffsetDateTime firstResponse,
        OffsetDateTime lastResponse,
        String timelineGranularity,
        List<KpiDto> kpis,
        List<TimePointDto> timeline,
        DistributionDto organizationType,
        DistributionDto organizationSize,
        DistributionDto department,
        DistributionDto branch,
        DistributionDto sector,
        DistributionDto demandedLevel,
        DistributionDto channel,
        DistributionDto hiring,
        DistributionDto hiringProbability,
        DistributionDto positions,
        List<HiringMatrixCellDto> hiringByProbability,
        List<ValuationDto> valuations,
        List<GroupBalanceDto> balanceByHiring,
        List<CompetenceDto> competences,
        List<SizeCompetenceDto> sizeCompetence) {

    /**
     * Indicador con su variación frente al periodo anterior de 7 días. {@code changeFormat}: «percent» para
     * conteos (variación relativa), «points» para porcentajes y promedios (diferencia en puntos).
     * {@code change} es null cuando la base de comparación es insuficiente.
     */
    public record KpiDto(String key, String label, Double value, String unit,
                         Double previous, Double change, String changeFormat, long base) { }

    public record TimePointDto(String bucket, long count, long cumulative) { }

    /** Distribución de una pregunta. Los porcentajes se calculan sobre las personas que respondieron. */
    public record DistributionDto(String key, long answered, long missing, List<CountDto> items) { }

    public record CountDto(String label, long count, double percent) { }

    public record HiringMatrixCellDto(String hired, String probability, long count) { }

    /** Balance de acuerdo de una afirmación. El índice neto va de -100 a 100 y excluye «No sabe». */
    public record ValuationDto(String key, String group, long answered, long agree, long partly,
                               long disagree, long noKnow, Double netIndex) { }

    public record GroupBalanceDto(String group, String hired, long answered, Double netIndex) { }

    public record CompetenceDto(String code, String name, String group, long answered, long notObserved,
                                Double average, Double standardDeviation, Double median,
                                Map<Integer, Long> levels, double lowShare) { }

    public record SizeCompetenceDto(String size, String code, String name, long answered, Double average) { }
}
