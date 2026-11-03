package com.simulacionem.encuesta.application.service;

import org.apache.commons.csv.CSVRecord;

import java.util.List;
import java.util.Map;
import java.util.Set;

interface SurveyFieldMapper {
    Map<String, Object> map(List<String> headers, CSVRecord record, List<FieldMappingSupport.MappingIssue> issues);

    default List<GridMappingDefinition> gridDefinitions() {
        return List.of();
    }

    /** Reglas de completitud de una fila ya normalizada. Un ERROR deja la fila fuera del análisis. */
    default List<FieldMappingSupport.MappingIssue> validate(Map<String, Object> values, int rowNumber) {
        return List.of();
    }

    /**
     * Igual que {@link #validate(Map, int)}, sabiendo qué preguntas trae el archivo ({@code presentKeys}, claves
     * internas de sus columnas). Una pregunta que el archivo no incluye se informa una sola vez para todo el
     * archivo, no como respuesta vacía en cada fila.
     */
    default List<FieldMappingSupport.MappingIssue> validate(Map<String, Object> values, int rowNumber, Set<String> presentKeys) {
        return validate(values, rowNumber);
    }

    /** Preguntas del instrumento que el mapeador espera; las que el archivo no trae se informan al importar. */
    default List<ExpectedQuestion> expectedQuestions() {
        return List.of();
    }

    /**
     * Pregunta esperada del instrumento. Está presente si algún encabezado analizable (las columnas descartadas por
     * {@link SourceFormat} llegan como null) contiene alguno de sus fragmentos, sin acentos ni mayúsculas.
     */
    record ExpectedQuestion(String question, String impact, List<String> fragments) {
        boolean presentIn(List<String> headers) {
            return headers.stream()
                    .filter(java.util.Objects::nonNull)
                    .map(FieldMappingSupport::matchable)
                    .anyMatch(header -> fragments.stream().anyMatch(fragment -> header.contains(FieldMappingSupport.matchable(fragment))));
        }
    }

    /** Clave interna de una columna para el registro de mapeo del dataset; null si no se analiza. */
    default String columnKey(String header) {
        return null;
    }
}
