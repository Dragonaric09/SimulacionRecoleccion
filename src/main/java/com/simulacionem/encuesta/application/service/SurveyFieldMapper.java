package com.simulacionem.encuesta.application.service;

import org.apache.commons.csv.CSVRecord;

import java.util.List;
import java.util.Map;

interface SurveyFieldMapper {
    Map<String, Object> map(List<String> headers, CSVRecord record, List<FieldMappingSupport.MappingIssue> issues);

    default List<GridMappingDefinition> gridDefinitions() {
        return List.of();
    }

    /** Reglas de completitud de una fila ya normalizada. Un ERROR deja la fila fuera del análisis. */
    default List<FieldMappingSupport.MappingIssue> validate(Map<String, Object> values, int rowNumber) {
        return List.of();
    }

    /** Clave interna de una columna para el registro de mapeo del dataset; null si no se analiza. */
    default String columnKey(String header) {
        return null;
    }
}
