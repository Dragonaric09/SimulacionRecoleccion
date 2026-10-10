package com.simulacionem.encuesta.infrastructure.persistence;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Component
public class SurveyJsonMapper {

    private static final Set<String> TITULADO_BOOLEAN_COLUMNS = Set.of(
            "realizo_postgrado",
            "interes_postgrado_futuro",
            "primer_empleo",
            "interes_red_contactos"
    );

    private static final Set<String> EMPLEADOR_BOOLEAN_COLUMNS = Set.of(
            "contratacion_ultimos_5años"
    );

    private static final Set<String> INTEGER_COLUMNS = Set.of(
            "año_egreso",
            "opinion_postgrado_fcyt",
            "existe_programas_afines",
            "años_vida_profesional",
            "años_desempleado",
            "satisfaccion_negocio",
            "importancia_formacion_negocio",
            "cantidad_empleos",
            "satisfaccion_formacion",
            "concordancia_formacion_mercado",
            "opinion_confianza_formadora",
            "opinion_titulo_consistente",
            "opinion_consulta_regularmente",
            "opinion_conoce_perfil",
            "opinion_perfil_coherente",
            "opinion_desempeño_destacado",
            "opinion_incorpora_necesidades",
            "opinion_competencias_laborales",
            "opinion_valores_actitudes",
            "opinion_participacion_retroalimentacion"
    );

    private final ObjectMapper objectMapper;

    public SurveyJsonMapper(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public List<Map<String, Object>> extraerRegistros(JsonNode payload) {
        List<Map<String, Object>> records = new ArrayList<>();
        if (payload == null || payload.isNull()) {
            return records;
        }

        if (payload.isArray()) {
            payload.forEach(record -> records.add(asMap(record)));
            return records;
        }

        if (payload.isObject()) {
            JsonNode dataNode = firstArrayField(payload, "data", "records", "responses", "items", "values", "titulados", "empleadores", "titulado", "empleador");
            if (dataNode != null && dataNode.isArray()) {
                dataNode.forEach(record -> records.add(asMap(record)));
                return records;
            }

            return List.of(asMap(payload));
        }

        return List.of();
    }

    public Map<String, Object> mapearTitulado(JsonNode payload) {
        return mapearRegistro(payload, SurveyTarget.TITULADO);
    }

    public Map<String, Object> mapearEmpleador(JsonNode payload) {
        return mapearRegistro(payload, SurveyTarget.EMPLEADOR);
    }

    private Map<String, Object> mapearRegistro(JsonNode payload, SurveyTarget target) {
        Map<String, Object> source = asMap(payload);
        Map<String, JsonNode> index = indexFields(payload);
        Map<String, Object> resultado = new LinkedHashMap<>();

        for (String column : target.columns) {
            JsonNode valueNode = resolveValue(index, column);
            resultado.put(column, convertValue(column, valueNode));
        }

        return resultado;
    }

    private Map<String, Object> asMap(JsonNode node) {
        if (node == null || node.isNull()) {
            return Map.of();
        }

        if (!node.isObject()) {
            return Map.of("value", simpleValue(node));
        }

        Map<String, Object> values = new HashMap<>();
        Iterator<Map.Entry<String, JsonNode>> fields = node.fields();
        while (fields.hasNext()) {
            Map.Entry<String, JsonNode> field = fields.next();
            values.put(field.getKey(), simpleValue(field.getValue()));
        }
        return values;
    }

    private Map<String, JsonNode> indexFields(JsonNode node) {
        Map<String, JsonNode> index = new HashMap<>();
        if (node == null || !node.isObject()) {
            return index;
        }

        Iterator<Map.Entry<String, JsonNode>> fields = node.fields();
        while (fields.hasNext()) {
            Map.Entry<String, JsonNode> field = fields.next();
            index.put(normalizar(field.getKey()), field.getValue());
        }
        return index;
    }

    private JsonNode resolveValue(Map<String, JsonNode> index, String column) {
        for (String candidate : aliasesFor(column)) {
            JsonNode value = index.get(candidate);
            if (value != null && !value.isNull()) {
                return value;
            }
        }
        return null;
    }

    private List<String> aliasesFor(String column) {
        List<String> aliases = new ArrayList<>();
        aliases.add(normalizar(column));

        String withoutAccents = column
                .replace("á", "a")
                .replace("é", "e")
                .replace("í", "i")
                .replace("ó", "o")
                .replace("ú", "u")
                .replace("Á", "a")
                .replace("É", "e")
                .replace("Í", "i")
                .replace("Ó", "o")
                .replace("Ú", "u")
                .replace("ñ", "n")
                .replace("Ñ", "n");
        aliases.add(normalizar(withoutAccents));

        if (column.contains("postgrado")) {
            aliases.add(normalizar(column.replace("postgrado", "posgrado")));
        }
        if (column.contains("año")) {
            aliases.add(normalizar(column.replace("año", "anio")));
        }
        if (column.contains("años")) {
            aliases.add(normalizar(column.replace("años", "anios")));
        }
        if (column.contains("tamaño")) {
            aliases.add(normalizar(column.replace("tamaño", "tamano")));
        }
        if (column.contains("desempeño")) {
            aliases.add(normalizar(column.replace("desempeño", "desempeno")));
        }

        return aliases;
    }

    private Object convertValue(String column, JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }

        if (INTEGER_COLUMNS.contains(column)) {
            if (node.isNumber()) {
                return node.intValue();
            }
            String text = node.asText("").trim();
            if (text.isEmpty()) {
                return null;
            }
            try {
                return Integer.parseInt(text);
            } catch (NumberFormatException ignored) {
                return null;
            }
        }

        if (TITULADO_BOOLEAN_COLUMNS.contains(column) || EMPLEADOR_BOOLEAN_COLUMNS.contains(column)) {
            return normalizeYesNo(node);
        }

        if (node.isArray() || node.isObject()) {
            try {
                return objectMapper.writeValueAsString(node);
            } catch (JsonProcessingException e) {
                return node.toString();
            }
        }

        String text = node.asText(null);
        return text == null || text.isBlank() ? null : text;
    }

    private Object simpleValue(JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }
        if (node.isBoolean()) {
            return node.booleanValue();
        }
        if (node.isNumber()) {
            return node.numberValue();
        }
        if (node.isArray() || node.isObject()) {
            return node.toString();
        }
        String text = node.asText(null);
        return text == null || text.isBlank() ? null : text;
    }

    private String normalizeYesNo(JsonNode node) {
        if (node.isBoolean()) {
            return node.booleanValue() ? "SI" : "NO";
        }
        if (node.isNumber()) {
            return node.intValue() == 0 ? "NO" : "SI";
        }
        String text = node.asText("").trim();
        if (text.isEmpty()) {
            return null;
        }

        String normalized = normalizar(text);
        if (Set.of("si", "s", "true", "1", "yes", "y").contains(normalized)) {
            return "SI";
        }
        if (Set.of("no", "false", "0", "n").contains(normalized)) {
            return "NO";
        }
        return text;
    }

    private String normalizar(String value) {
        return value == null ? "" : value
                .trim()
                .toLowerCase(Locale.ROOT)
                .replaceAll("[áàäâ]", "a")
                .replaceAll("[éèëê]", "e")
                .replaceAll("[íìïî]", "i")
                .replaceAll("[óòöô]", "o")
                .replaceAll("[úùüû]", "u")
                .replace('ñ', 'n')
                .replaceAll("[^a-z0-9]+", "");
    }

    private JsonNode firstArrayField(JsonNode node, String... fieldNames) {
        for (String fieldName : fieldNames) {
            JsonNode child = node.get(fieldName);
            if (child != null && child.isArray()) {
                return child;
            }
        }
        return null;
    }

    private enum SurveyTarget {
        TITULADO(List.of(
                "edad",
                "genero",
                "año_egreso",
                "realizo_postgrado",
                "tipo_postgrado",
                "nivel_postgrado",
                "institucion_postgrado",
                "financiamiento_postgrado",
                "nombre_programa",
                "interes_postgrado_futuro",
                "area_interes",
                "institucion_preferida",
                "opinion_postgrado_fcyt",
                "existe_programas_afines",
                "años_vida_profesional",
                "años_desempleado",
                "situacion_laboral",
                "origen_emprendimiento",
                "tipo_entregable",
                "financiamiento_externo",
                "satisfaccion_negocio",
                "importancia_formacion_negocio",
                "primer_empleo",
                "tiempo_primer_empleo",
                "cantidad_empleos",
                "satisfaccion_formacion",
                "concordancia_formacion_mercado",
                "util_practicas_teoricas",
                "util_pasantias",
                "util_horarios",
                "util_habilidades_analiticas",
                "util_equipos_multidisciplinarios",
                "util_herramientas_software",
                "mejora_integracion_teoria",
                "mejora_relacion_empresas",
                "mejora_horarios",
                "mejora_actualizacion_plan",
                "mejora_actividades_extracurriculares",
                "mejora_especializaciones",
                "asignaturas_utiles",
                "asignaturas_no_utiles",
                "interes_red_contactos",
                "email_contacto",
                "telefono_contacto",
                "whatsapp_contacto",
                "linkedin_url"
        )),
        EMPLEADOR(List.of(
                "email_contacto",
                "nombre_empresa",
                "tipo_organizacion",
                "tamaño_organizacion",
                "rubro_sector",
                "contratacion_ultimos_5años",
                "posibilidad_contratacion_futura",
                "nivel_formacion_demandado",
                "convoca_medios_escritos",
                "convoca_internet",
                "convoca_competitiva",
                "convoca_personal",
                "convoca_recomendaciones",
                "convoca_otros",
                "cargo_apoyo",
                "cargo_tecnico",
                "cargo_analista",
                "cargo_especialista",
                "cargo_supervisor",
                "cargo_jefatura",
                "cargo_consultor",
                "cargo_otro",
                "areas_conocimiento_emergentes",
                "herramientas_tecnologicas",
                "competencias_fundamentales",
                "opinion_confianza_formadora",
                "opinion_titulo_consistente",
                "opinion_consulta_regularmente",
                "opinion_conoce_perfil",
                "opinion_perfil_coherente",
                "opinion_desempeño_destacado",
                "opinion_incorpora_necesidades",
                "opinion_competencias_laborales",
                "opinion_valores_actitudes",
                "opinion_participacion_retroalimentacion"
        ));

        private final List<String> columns;

        SurveyTarget(List<String> columns) {
            this.columns = columns;
        }
    }
}