package com.simulacionem.encuesta.application.dto;

public record ImportIssueDto(
        Integer row,
        Integer column,
        String columnName,
        String severity,
        String code,
        String message) {
}
