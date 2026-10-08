package com.simulacionem.encuesta.application.dto;

import java.util.List;
import java.util.UUID;

public record ImportReportDto(
        UUID datasetId,
        String surveyType,
        String status,
        int rowsRead,
        int rowsValid,
        int rowsRejected,
        int warnings,
        int errors,
        List<ImportIssueDto> issues) {
}
