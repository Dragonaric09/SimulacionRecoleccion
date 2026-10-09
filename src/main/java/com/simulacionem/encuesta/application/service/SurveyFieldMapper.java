package com.simulacionem.encuesta.application.service;

import org.apache.commons.csv.CSVRecord;

import java.util.List;
import java.util.Map;

interface SurveyFieldMapper {
    Map<String, Object> map(List<String> headers, CSVRecord record, List<FieldMappingSupport.MappingIssue> issues);

    default List<GridMappingDefinition> gridDefinitions() {
        return List.of();
    }
}
