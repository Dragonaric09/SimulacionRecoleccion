package com.simulacionem.encuesta.application.service;

import org.apache.commons.csv.CSVRecord;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static com.simulacionem.encuesta.application.service.FieldMappingSupport.applyMappings;
import static com.simulacionem.encuesta.application.service.FieldMappingSupport.clean;
import static com.simulacionem.encuesta.application.service.FieldMappingSupport.firstValue;

/**
 * Instrumento de empleadores tal como se publicó (form/form_export_empleadores00.json).
 *
 * Las afirmaciones de valoración y las competencias son preguntas en cuadrícula: en el CSV cada
 * columna lleva el enunciado completo entre corchetes, así que se emparejan por igualdad exacta
 * (sin acentos ni mayúsculas) y nunca por palabras sueltas.
 */
@Component
final class EmpleadoresFieldMapper implements SurveyFieldMapper {

    /** Una afirmación de la cuadrícula de valoración (escala de acuerdo de 4 niveles). */
    record Valuation(String key, String group, String statement) { }

    static final List<Valuation> VALUATIONS = List.of(
            // Formación y perfil profesional
            new Valuation("valoracion_formacion_1", "formacion", "La Carrera de Ingeniería de Sistemas de la Universidad Mayor de San Simón brinda confianza a nuestra organización como formadora de profesionales del área tecnológica."),
            new Valuation("valoracion_formacion_2", "formacion", "Considero que el título profesional otorgado por la Carrera de Ingeniería de Sistemas es consistente con el nivel de formación y las competencias demostradas por sus titulados."),
            new Valuation("valoracion_formacion_3", "formacion", "Las autoridades de la Carrera de Ingeniería de Sistemas consultan regularmente nuestra opinión como empleadores respecto al perfil profesional y las competencias requeridas en el ámbito laboral."),
            new Valuation("valoracion_formacion_4", "formacion", "Conozco el perfil profesional y las competencias de egreso declaradas por la Carrera de Ingeniería de Sistemas."),
            new Valuation("valoracion_formacion_5", "formacion", "El perfil profesional declarado por la Carrera de Ingeniería de Sistemas es coherente con el desempeño laboral demostrado por sus titulados."),
            new Valuation("valoracion_formacion_6", "formacion", "La formación proporcionada por la Carrera de Ingeniería de Sistemas permite a sus titulados alcanzar un desempeño destacado tanto en el ámbito profesional como en su formación integral."),
            new Valuation("valoracion_formacion_7", "formacion", "La Carrera de Ingeniería de Sistemas considera nuestra opinión como empleadores e incorpora las necesidades del sector laboral en la definición y mejora de actividades de formación práctica, pasantías y modalidades de titulación."),
            new Valuation("valoracion_formacion_8", "formacion", "El desempeño profesional de los titulados de Ingeniería de Sistemas evidencia el desarrollo de competencias laborales como: comunicación efectiva, análisis y resolución de problemas, pensamiento crítico, aprendizaje continuo, trabajo en equipo, iniciativa personal y manejo adecuado de tecnologías de información."),
            new Valuation("valoracion_formacion_9", "formacion", "Los profesionales titulados de Ingeniería de Sistemas demuestran valores y actitudes relacionados con la ética profesional, responsabilidad social, inclusión, diversidad, respeto a los derechos humanos y compromiso con el medio ambiente."),
            new Valuation("valoracion_formacion_10", "formacion", "He participado en procesos de recopilación de información, evaluación o retroalimentación relacionados con el desempeño laboral de los titulados de la Carrera de Ingeniería de Sistemas."),
            // Relación de la carrera con la organización
            new Valuation("valoracion_relacion_1", "relacion", "La Carrera de Ingeniería de Sistemas mantiene vínculos con organizaciones e instituciones que generan oportunidades laborales para sus titulados."),
            new Valuation("valoracion_relacion_2", "relacion", "He participado en actividades de vinculación con el entorno laboral y tecnológico organizadas por la Carrera de Ingeniería de Sistemas o la Facultad de Ciencias y Tecnología."),
            new Valuation("valoracion_relacion_3", "relacion", "He participado en actividades de difusión de oportunidades laborales, convocatorias, pasantías o prácticas profesionales organizadas por la Carrera de Ingeniería de Sistemas."),
            new Valuation("valoracion_relacion_4", "relacion", "He participado en actividades de vinculación entre profesionales del sector tecnológico, empleadores, docentes y estudiantes de la Carrera de Ingeniería de Sistemas para el intercambio de conocimientos, experiencias y desarrollo de trabajos conjuntos."),
            new Valuation("valoracion_relacion_5", "relacion", "Como empleador, he sido consultado sobre el desempeño profesional de los titulados de Ingeniería de Sistemas, con el propósito de retroalimentar el perfil profesional y el plan de estudios de la Carrera."),
            new Valuation("valoracion_relacion_6", "relacion", "Como empleador, la Carrera de Ingeniería de Sistemas ha consultado nuestra opinión respecto a la pertinencia de la formación impartida y su correspondencia con las necesidades del sector tecnológico y laboral."),
            new Valuation("valoracion_relacion_7", "relacion", "Cuando nuestra organización requiere profesionales del área de Sistemas, recurrimos a la Universidad Mayor de San Simón y a la Carrera de Ingeniería de Sistemas como fuente de búsqueda de talento profesional."),
            new Valuation("valoracion_relacion_8", "relacion", "He sido consultado periódicamente por la Carrera de Ingeniería de Sistemas durante sus procesos de autoevaluación y mejora continua.")
    );

    /** Búsqueda directa por enunciado normalizado: no recorre las 18 afirmaciones por cada columna de cada fila. */
    static final Map<String, Valuation> VALUATION_BY_STATEMENT = VALUATIONS.stream()
            .collect(java.util.stream.Collectors.toMap(v -> FieldMappingSupport.matchable(v.statement()), v -> v));

    /** Nombre de competencia del formulario (normalizado) → código del catálogo de competencias (V1). */
    static final Map<String, String> COMPETENCE_CODES = Map.ofEntries(
            Map.entry("programacion y desarrollo de software", "programacion_software"),
            Map.entry("bases de datos", "bases_datos"),
            Map.entry("redes e infraestructura", "redes_infraestructura"),
            Map.entry("seguridad informatica", "seguridad_informatica"),
            Map.entry("analisis de datos", "analisis_datos"),
            Map.entry("ingenieria de requisitos y modelado de sistemas", "ingenieria_requisitos"),
            Map.entry("gestion de proyectos", "gestion_proyectos"),
            Map.entry("cloud / devops", "cloud_devops"),
            Map.entry("comunicacion oral y escrita", "comunicacion"),
            Map.entry("trabajo en equipo", "trabajo_equipo"),
            Map.entry("resolucion de problemas", "resolucion_problemas"),
            Map.entry("liderazgo", "liderazgo"),
            Map.entry("ingles tecnico", "ingles_tecnico"),
            Map.entry("aprendizaje autonomo", "aprendizaje_autonomo"));

    /** Opciones de la pregunta de casillas «tipo de cargos» (orden 23 del formulario). */
    static final List<String> CARGO_OPTIONS = List.of(
            "De apoyo / asistencia tecnológica",
            "Técnico (desarrollo de software, administración de sistemas, redes, bases de datos, soporte TI)",
            "Analista (sistemas, datos, procesos o soluciones tecnológicas)",
            "Especialista (ciberseguridad, arquitectura de software, infraestructura tecnológica, entre otros)",
            "Supervisor / Coordinador de área tecnológica",
            "Jefatura o Gerencial (gestión de proyectos, dirección de TI, transformación digital)",
            "Consultor tecnológico");

    /** Columnas de la organización que se analizan (los datos de identificación no están aquí). */
    static final List<FieldMappingDefinition> DEFINITIONS = List.of(
            new FieldMappingDefinition("tipo_organizacion", "tipo de organización", MappingKind.TEXT),
            new FieldMappingDefinition("anio_inicio_operaciones", "año de inicio de operaciones", MappingKind.NUMBER),
            new FieldMappingDefinition("departamento_organizacion", "departamento", MappingKind.TEXT),
            new FieldMappingDefinition("presencia_sedes", "presencia de sedes", MappingKind.TEXT),
            new FieldMappingDefinition("redes_sociales_activas", "redes sociales activas", MappingKind.TEXT),
            new FieldMappingDefinition("area_representante", "área en la que se desempeña", MappingKind.TEXT),
            new FieldMappingDefinition("cargo_representante", "cargo del representante", MappingKind.TEXT),
            new FieldMappingDefinition("tamano_organizacion", "tamaño de la organización", MappingKind.TEXT),
            new FieldMappingDefinition("rubro_organizacion", "rubro o sector principal", MappingKind.TEXT),
            new FieldMappingDefinition("posibilidad_incorporacion", "posibilidad de incorporar ingenieros", MappingKind.TEXT),
            new FieldMappingDefinition("nivel_formacion_demandado", "nivel de formación académica o actualización profesional", MappingKind.TEXT),
            new FieldMappingDefinition("medio_convocatoria", "medio convoca a profesionales", MappingKind.TEXT),
            new FieldMappingDefinition("areas_conocimiento_demandadas", "nuevas áreas de conocimiento", MappingKind.TEXT),
            new FieldMappingDefinition("herramientas_tecnologicas_demandadas", "nuevas herramientas tecnológicas", MappingKind.TEXT),
            new FieldMappingDefinition("habilidades_demandadas", "habilidades, competencias y destrezas", MappingKind.TEXT),
            new FieldMappingDefinition("competencia_faltante_titulados", "qué competencia considera que más les falta", MappingKind.TEXT),
            new FieldMappingDefinition("contrato_titulados_ultimos_5_anios", "ha contratado ingenieros", MappingKind.BOOLEAN)
    );

    /** Columnas que deben tener respuesta para que la fila entre al análisis (advertencia si falta). */
    private static final List<String> CORE_FIELDS = List.of(
            "tipo_organizacion", "tamano_organizacion", "rubro_organizacion", "departamento_organizacion",
            "presencia_sedes", "contrato_titulados_ultimos_5_anios", "posibilidad_incorporacion",
            "nivel_formacion_demandado", "medio_convocatoria");

    @Override
    public Map<String, Object> map(List<String> headers, CSVRecord record, List<FieldMappingSupport.MappingIssue> issues) {
        Map<String, Object> values = FieldMappingSupport.baseValues(headers, record);
        applyMappings(values, headers, record, DEFINITIONS, issues);
        putCargos(values, headers, record);
        mapGrids(values, headers, record, issues);
        return values;
    }

    @Override
    public List<FieldMappingSupport.MappingIssue> validate(Map<String, Object> values, int rowNumber) {
        List<FieldMappingSupport.MappingIssue> issues = new ArrayList<>();
        boolean hasCompetence = values.keySet().stream().anyMatch(key -> key.startsWith("competence:"));
        if (!values.containsKey("tipo_organizacion") || !values.containsKey("tamano_organizacion") || !hasCompetence) {
            issues.add(issue(rowNumber, "ERROR", "RESPUESTA_INCOMPLETA",
                    "Faltan el tipo o tamaño de la organización o las competencias valoradas; la fila no entra al análisis"));
        }
        for (String key : CORE_FIELDS) {
            if (!values.containsKey(key)) {
                issues.add(issue(rowNumber, "ADVERTENCIA", "CAMPO_VACIO", "Sin respuesta en «" + key + "»"));
            }
        }
        long missingValuations = VALUATIONS.stream().filter(valuation -> !values.containsKey(valuation.key())).count();
        if (missingValuations > 0) {
            issues.add(issue(rowNumber, "ADVERTENCIA", "VALORACION_VACIA",
                    missingValuations + " de " + VALUATIONS.size() + " afirmaciones de valoración sin respuesta"));
        }
        return issues;
    }

    @Override
    public String columnKey(String header) {
        Valuation valuation = valuationFor(header);
        if (valuation != null) return valuation.key();
        String competence = competenceCode(header);
        if (competence != null) return "competence:" + competence;
        String normalized = normalize(header);
        for (FieldMappingDefinition definition : DEFINITIONS) {
            if (normalized.contains(normalize(definition.headerFragment()))) return definition.key();
        }
        if (normalized.contains(normalize("tipo de cargos desempeñan"))) return "cargos_titulados";
        return null;
    }

    @Override
    public List<GridMappingDefinition> gridDefinitions() {
        return List.of();
    }

    private void mapGrids(Map<String, Object> values, List<String> headers, CSVRecord record,
                          List<FieldMappingSupport.MappingIssue> issues) {
        for (int column = 0; column < headers.size() && column < record.size(); column++) {
            String header = clean(headers.get(column));
            if (header == null) continue;
            String value = clean(record.get(column));
            String competence = competenceCode(header);
            if (competence != null) {
                if (value != null) values.put("competence:" + competence, value);
                continue;
            }
            Valuation valuation = valuationFor(header);
            if (valuation != null) {
                if (value != null) values.put(valuation.key(), value);
                continue;
            }
            if (marker(header) == null) continue;
            String code = isCompetenceHeader(header) ? "COMPETENCIA_NO_RECONOCIDA" : "COLUMNA_NO_RECONOCIDA";
            String message = isCompetenceHeader(header)
                    ? "La competencia «" + marker(header) + "» no está en el catálogo y no se analiza"
                    : "La pregunta «" + header.trim() + "» no pertenece al instrumento publicado y no se analiza";
            issues.add(new FieldMappingSupport.MappingIssue((int) record.getRecordNumber() + 1, column + 1, header, value,
                    "ADVERTENCIA", code, message));
        }
    }

    /** Casillas: se guardan como texto con las opciones marcadas separadas por «; ». */
    private void putCargos(Map<String, Object> values, List<String> headers, CSVRecord record) {
        String text = firstValue(headers, record, "tipo de cargos desempeñan");
        if (text == null) return;
        List<String> selected = CARGO_OPTIONS.stream()
                .filter(option -> normalize(text).contains(normalize(option)))
                .toList();
        values.put("cargos_titulados", selected.isEmpty() ? text : String.join("; ", selected));
    }

    private Valuation valuationFor(String header) {
        String marker = marker(header);
        if (marker == null || isCompetenceHeader(header)) return null;
        return VALUATION_BY_STATEMENT.get(normalize(marker));
    }

    private String competenceCode(String header) {
        if (!isCompetenceHeader(header)) return null;
        String marker = marker(header);
        return marker == null ? null : COMPETENCE_CODES.get(normalize(marker));
    }

    private boolean isCompetenceHeader(String header) {
        String normalized = normalize(header);
        return normalized.startsWith("competencias tecnicas") || normalized.startsWith("competencias transversales");
    }

    /** Texto entre el primer «[» y el último «]» del encabezado, o null si no tiene corchetes. */
    private static String marker(String header) {
        int start = header.indexOf('[');
        int end = header.lastIndexOf(']');
        return start >= 0 && end > start ? clean(header.substring(start + 1, end)) : null;
    }

    private static String normalize(String value) {
        return FieldMappingSupport.matchable(value);
    }

    private static FieldMappingSupport.MappingIssue issue(int row, String severity, String code, String message) {
        return new FieldMappingSupport.MappingIssue(row, null, null, null, severity, code, message);
    }
}
