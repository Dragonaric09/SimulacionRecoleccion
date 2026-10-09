package com.simulacionem.encuesta.application.service;

import org.apache.commons.csv.CSVRecord;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

final class GridMappingSupport {
    private GridMappingSupport() { }

    static void applyMappings(Map<String, Object> values,
                              List<String> headers,
                              CSVRecord record,
                              List<GridMappingDefinition> definitions,
                              Function<String, String> competenceCode) {
        Map<Integer, Integer> matchesByDefinition = new HashMap<>();
        for (int column = 0; column < headers.size() && column < record.size(); column++) {
            String header = FieldMappingSupport.clean(headers.get(column));
            String marker = marker(header);
            if (header == null || marker == null) continue;

            for (int definitionIndex = 0; definitionIndex < definitions.size(); definitionIndex++) {
                GridMappingDefinition definition = definitions.get(definitionIndex);
                if (!matches(definition, header)) continue;

                int ordinal = matchesByDefinition.getOrDefault(definitionIndex, 0);
                if (ordinal >= definition.maxMatches()) continue;
                String value = FieldMappingSupport.clean(record.get(column));
                if (value == null) break;

                if (definition.kind() == GridMappingKind.COMPETENCE) {
                    values.put("competence:" + competenceCode.apply(marker), value);
                } else {
                    values.put("valoracion_" + definition.outputGroup() + "_"
                            + (definition.outputStart() + ordinal), value);
                }
                matchesByDefinition.put(definitionIndex, ordinal + 1);
                break;
            }
        }
    }

    private static boolean matches(GridMappingDefinition definition, String header) {
        if (definition.kind() == GridMappingKind.COMPETENCE) {
            return FieldMappingSupport.matchable(header).contains(FieldMappingSupport.matchable("competencias"));
        }
        return !FieldMappingSupport.matchable(header).contains(FieldMappingSupport.matchable("competencias"))
                && FieldMappingSupport.matchable(header).contains(FieldMappingSupport.matchable(definition.headerFragment()));
    }

    private static String marker(String header) {
        if (header == null) return null;
        int start = header.indexOf('[');
        int end = header.indexOf(']', start + 1);
        return start >= 0 && end > start ? FieldMappingSupport.clean(header.substring(start + 1, end)) : null;
    }
}
