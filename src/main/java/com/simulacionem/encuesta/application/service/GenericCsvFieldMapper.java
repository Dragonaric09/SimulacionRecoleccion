package com.simulacionem.encuesta.application.service;

import org.apache.commons.csv.CSVRecord;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Conservative fallback for a CSV whose survey type could not be detected.
 * It preserves non-personal columns and applies only reusable metadata rules.
 */
final class GenericCsvFieldMapper {
    private GenericCsvFieldMapper() { }

    static Map<String, Object> map(List<String> headers, CSVRecord record) {
        Map<String, Object> values = FieldMappingSupport.baseValues(headers, record);
        List<FieldMappingDefinition> definitions = new ArrayList<>();
        definitions.addAll(TituladosFieldMapper.DEFINITIONS);
        definitions.addAll(EmpleadoresFieldMapper.DEFINITIONS);
        FieldMappingSupport.applyMappings(values, headers, record, definitions, new ArrayList<>());
        return values;
    }
}
