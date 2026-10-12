package com.simulacionem.analitica.application.dto;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/** Página de la tabla detallada de respuestas de empleadores. Solo campos no personales. */
public record EmployerResponsePageDto(long total, int page, int size, List<Row> rows) {

    public record Row(UUID id, OffsetDateTime submittedAt, String organizationType, String organizationSize,
                      String department, String sector, String hired, String hiringProbability,
                      String demandedLevel, String channel, Double competenceAverage, int fullAgreement) { }
}
