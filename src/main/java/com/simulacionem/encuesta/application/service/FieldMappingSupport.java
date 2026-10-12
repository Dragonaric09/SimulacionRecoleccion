package com.simulacionem.encuesta.application.service;

import org.apache.commons.csv.CSVRecord;

import java.text.Normalizer;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

final class FieldMappingSupport {
    /** Límite de las memorias de normalización; los encabezados son pocos, así que casi nunca se alcanza. */
    private static final int CACHE_LIMIT = 20_000;
    private static final Map<String, String> MATCHABLE_CACHE = new ConcurrentHashMap<>();
    private static final Map<String, Boolean> PERSONAL_CACHE = new ConcurrentHashMap<>();

    private FieldMappingSupport() { }

    static Map<String, Object> baseValues(List<String> headers, CSVRecord record) {
        Map<String, Object> values = new LinkedHashMap<>();
        for (int i = 0; i < headers.size(); i++) {
            String header = clean(headers.get(i));
            String value = i < record.size() ? clean(record.get(i)) : null;
            if (header == null || value == null || isPersonal(header)) continue;
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

    /**
     * Datos personales o de identificación que nunca se analizan ni se muestran: correo, nombres,
     * teléfono, LinkedIn, NIT, razón social, nombre comercial, dirección, representante y página web.
     * Es la única lista del proyecto; la comparación ignora acentos y mayúsculas.
     */
    static boolean isPersonal(String header) {
        if (header == null) return false;
        if (PERSONAL_CACHE.size() > CACHE_LIMIT) PERSONAL_CACHE.clear();
        return PERSONAL_CACHE.computeIfAbsent(header, FieldMappingSupport::isPersonalUncached);
    }

    private static boolean isPersonalUncached(String header) {
        String value = matchable(header);
        return value.contains("correo") || value.contains("email") || value.contains("nombre") || value.contains("apellido")
                || value.contains("razon social") || value.contains("direccion") || value.contains("telefon")
                || value.contains("whatsapp") || value.contains("linkedin") || value.contains("representante")
                || value.contains("pagina web") || value.matches(".*\\bnit\\b.*");
    }

    /**
     * Forma comparable de un texto (sin acentos, minúsculas, espacios simples). Se memoriza porque el mismo
     * encabezado se compara en cada una de las filas de un archivo grande.
     */
    static String matchable(String value) {
        if (value == null) return "";
        if (MATCHABLE_CACHE.size() > CACHE_LIMIT) MATCHABLE_CACHE.clear();
        return MATCHABLE_CACHE.computeIfAbsent(value, FieldMappingSupport::matchableUncached);
    }

    private static String matchableUncached(String value) {
        return Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("\\s+", " ")
                .trim();
    }

    record MappingIssue(Integer row, Integer column, String columnName, String originalValue,
                        String severity, String code, String message) { }
}
