package com.simulacionem.encuesta.application.service;

import org.apache.commons.csv.CSVRecord;

import java.text.Normalizer;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

final class FieldMappingSupport {
    private FieldMappingSupport() { }

    static Map<String, Object> baseValues(List<String> headers, CSVRecord record) {
        Map<String, Object> values = new LinkedHashMap<>();
        for (int i = 0; i < headers.size(); i++) {
            String header = clean(headers.get(i));
            String value = i < record.size() ? clean(record.get(i)) : null;
            if (header == null || value == null || personal(header)) continue;
            values.put("column_" + (i + 1), value);
        }
        return values;
    }

    static void putKnown(Map<String, Object> values, List<String> headers, CSVRecord record, String key, String fragment) {
        String value = firstValue(headers, record, fragment);
        if (value != null) values.put(key, value);
    }

    static void applyMappings(Map<String, Object> values, List<String> headers, CSVRecord record,
                              List<FieldMappingDefinition> definitions, List<MappingIssue> issues) {
        for (FieldMappingDefinition definition : definitions) {
            switch (definition.kind()) {
                case TEXT, CATEGORY, LIKERT, MULTI_CATEGORY -> putKnown(values, headers, record, definition.key(), definition.headerFragment());
                case BOOLEAN -> normalizeBoolean(values, headers, record, definition.key(), definition.headerFragment());
                case NUMBER -> normalizeNumber(values, headers, record, definition.key(), definition.headerFragment(), issues);
                case LABOR_STATUS -> normalizeLaborStatus(values, headers, record, definition.headerFragment());
            }
        }
    }

    static void normalizeBoolean(Map<String, Object> values, List<String> headers, CSVRecord record, String key, String fragment) {
        String value = firstValue(headers, record, fragment);
        if (value == null) return;
        String normalized = clean(value).toLowerCase(Locale.ROOT);
        if (normalized.equals("si") || normalized.equals("sí")) values.put(key, true);
        else if (normalized.equals("no")) values.put(key, false);
        else values.put(key, value);
    }

    static void normalizeLaborStatus(Map<String, Object> values, List<String> headers, CSVRecord record, String fragment) {
        String value = firstValue(headers, record, fragment);
        if (value == null) return;
        String normalized = clean(value).toLowerCase(Locale.ROOT)
                .replace("á", "a").replace("é", "e").replace("í", "i")
                .replace("ó", "o").replace("ú", "u");
        if (normalized.contains("trabaj") && (normalized.contains("organizacion") || normalized.contains("empresa"))) {
            values.put("situacion_laboral_actual", "Trabaja en una organización");
        } else if (normalized.contains("emprend")) {
            values.put("situacion_laboral_actual", "Emprendimiento propio");
        } else if (normalized.contains("busqueda") || normalized.contains("desemple")
                || normalized.contains("no trabaja") || normalized.contains("no trabajo")) {
            values.put("situacion_laboral_actual", "En búsqueda laboral");
        } else {
            values.put("situacion_laboral_actual", value);
        }
    }

    static void normalizeNumber(Map<String, Object> values, List<String> headers, CSVRecord record, String key, String fragment, List<MappingIssue> issues) {
        String value = firstValue(headers, record, fragment);
        if (value == null) return;
        String normalized = clean(value).toLowerCase(Locale.ROOT)
                .replace("á", "a").replace("é", "e").replace("í", "i")
                .replace("ó", "o").replace("ú", "u");
        if (Set.of("no aplica", "no corresponde", "n/a", "na", "no sabe", "no responde", "sin respuesta", "-").contains(normalized)) return;
        try {
            String numeric = value.replace(',', '.').replaceFirst("[^0-9.+-].*$", "");
            values.put(key, Double.parseDouble(numeric));
        } catch (NumberFormatException ex) {
            issues.add(new MappingIssue((int) record.getRecordNumber() + 1, indexOf(headers, fragment) + 1, fragment, value,
                    "ADVERTENCIA", "NUMERO_NO_RECONOCIDO",
                    "La respuesta «" + value + "» no es numérica para «" + fragment + "» y se omitirá del cálculo"));
        }
    }

    static String firstValue(List<String> headers, CSVRecord record, String fragment) {
        String wanted = clean(fragment);
        for (int i = 0; i < headers.size() && i < record.size(); i++) {
            String header = clean(headers.get(i));
            if (header != null && matchable(header).contains(matchable(wanted))) {
                String value = clean(record.get(i));
                if (value != null) return value;
            }
        }
        return null;
    }

    static int indexOf(List<String> headers, String fragment) {
        String wanted = clean(fragment);
        for (int i = 0; i < headers.size(); i++) {
            String header = clean(headers.get(i));
            if (header != null && matchable(header).contains(matchable(wanted))) return i;
        }
        return -1;
    }

    static String clean(String value) {
        if (value == null) return null;
        String result = value.trim();
        return result.isEmpty() ? null : result;
    }

    private static boolean personal(String header) {
        String value = header.toLowerCase(Locale.ROOT);
        return value.contains("correo") || value.contains("email") || value.contains("apellido")
                || value.contains("nombre de la empresa") || value.contains("nombre comercial")
                || value.contains("nit") || value.contains("razon social") || value.contains("direccion")
                || value.contains("telefono") || value.contains("whatsapp") || value.contains("linkedin") || value.contains("representante")
                || value.contains("pagina web");
    }

    static String matchable(String value) {
        return Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT);
    }

    record MappingIssue(Integer row, Integer column, String columnName, String originalValue,
                        String severity, String code, String message) { }
}
