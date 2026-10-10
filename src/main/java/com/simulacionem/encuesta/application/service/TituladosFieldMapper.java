package com.simulacionem.encuesta.application.service;

import org.apache.commons.csv.CSVRecord;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

import static com.simulacionem.encuesta.application.service.FieldMappingSupport.applyMappings;

@Component
final class TituladosFieldMapper implements SurveyFieldMapper {
    private static final List<GridMappingDefinition> GRID_DEFINITIONS = List.of(
            GridMappingDefinition.competence(),
            GridMappingDefinition.valuation("opinion personal respecto al posgrado", "formacion", 1, 1),
            GridMappingDefinition.valuation("evalua su formacion", "formacion", 2, 1),
            GridMappingDefinition.valuation("de manera global", "formacion", 3, 2),
            GridMappingDefinition.valuation("existe concordancia entre", "formacion", 5, 2)
    );

    static final List<FieldMappingDefinition> DEFINITIONS = List.of(
            new FieldMappingDefinition("edad_rango", "edad que tiene actualmente", MappingKind.TEXT),
            new FieldMappingDefinition("genero", "género", MappingKind.TEXT),
            new FieldMappingDefinition("anio_titulacion", "año de titulación", MappingKind.NUMBER),
            new FieldMappingDefinition("vinculo_laboral", "vinculo laboral", MappingKind.TEXT),
            new FieldMappingDefinition("area_especializacion", "area de especialización", MappingKind.TEXT),
            new FieldMappingDefinition("cargo_profesional", "cargo", MappingKind.TEXT),
            new FieldMappingDefinition("titulo_profesional", "titulo de profesion", MappingKind.TEXT),
            new FieldMappingDefinition("sector_trabajo", "sector en el que trabaja", MappingKind.TEXT),
            new FieldMappingDefinition("sector_trabajo_actual", "trabajo en el que se encuentra", MappingKind.TEXT),
            new FieldMappingDefinition("antiguedad_trabajo", "antiguedad tiene en su actual trabajo", MappingKind.TEXT),
            new FieldMappingDefinition("rubro_empresa", "rubro de la empresa", MappingKind.TEXT),
            new FieldMappingDefinition("rubro_trabajo_actual", "rubro de la organización", MappingKind.TEXT),
            new FieldMappingDefinition("rubro_otro", "otro rubro", MappingKind.TEXT),
            new FieldMappingDefinition("area_trabajo", "área dentro de la organización", MappingKind.MULTI_CATEGORY),
            new FieldMappingDefinition("cargo_actual", "cargo que desempeña en su actual trabajo", MappingKind.TEXT),
            new FieldMappingDefinition("departamento_trabajo", "departamento de bolivia", MappingKind.TEXT),
            new FieldMappingDefinition("medio_obtencion_empleo", "a través de qué medio obtuvo el trabajo", MappingKind.TEXT),
            new FieldMappingDefinition("pertinencia_trabajo_formacion", "peritnentes a sus formación", MappingKind.LIKERT),
            new FieldMappingDefinition("satisfaccion_formacion", "de manera global", MappingKind.LIKERT),
            new FieldMappingDefinition("concordancia_formacion_requerimientos", "existe concordancia entre", MappingKind.LIKERT),
            new FieldMappingDefinition("formacion_complementaria_nivel", "programa de formación complementaria de mayor nivel", MappingKind.TEXT),
            new FieldMappingDefinition("institucion_formacion_complementaria", "donde ha cursado el programa indicado", MappingKind.TEXT),
            new FieldMappingDefinition("nombre_programa_formacion", "indique el nombre del programa", MappingKind.TEXT),
            new FieldMappingDefinition("nivel_posgrado_interes", "qué nivel de posgrado le interesa", MappingKind.TEXT),
            new FieldMappingDefinition("area_posgrado_interes", "en cuál de las siguientes áreas le interesaría realizar el programa", MappingKind.MULTI_CATEGORY),
            new FieldMappingDefinition("modalidad_posgrado", "modalidad preferida", MappingKind.TEXT),
            new FieldMappingDefinition("institucion_posgrado_interes", "organización educativa optaría por realizar sus estudios", MappingKind.TEXT),
            new FieldMappingDefinition("financiamiento_posgrado_estimado", "cómo financiaría sus estudios", MappingKind.TEXT),
            new FieldMappingDefinition("financiamiento_posgrado_cursado", "fuente de financiamiento para cursar el programa", MappingKind.TEXT),
            new FieldMappingDefinition("aspectos_utiles", "aspectos de la Carrera les resultaron de bastante utilidad", MappingKind.MULTI_CATEGORY),
            new FieldMappingDefinition("aspectos_mejorables", "aspectos de la Carrera considera que pueden mejorarse", MappingKind.MULTI_CATEGORY),
            new FieldMappingDefinition("asignaturas_ventaja", "asignaturas cursadas en la Carrera que considera que le brindaron una ventaja competitiva", MappingKind.MULTI_CATEGORY),
            new FieldMappingDefinition("asignaturas_poco_utiles", "asignaturas cursadas en la Carrera que no le resultaron de mucha utilidad", MappingKind.MULTI_CATEGORY),
            new FieldMappingDefinition("remuneracion_rango", "remuneración promedio mensual", MappingKind.TEXT),
            new FieldMappingDefinition("origen_emprendimiento", "origen del desarrollo de su propio emprendimiento", MappingKind.TEXT),
            new FieldMappingDefinition("entregable_emprendimiento", "tipo de entregable genera el negocio", MappingKind.TEXT),
            new FieldMappingDefinition("financiamiento_emprendimiento", "requerido financiamiento externo para su negocio", MappingKind.TEXT),
            new FieldMappingDefinition("satisfaccion_emprendimiento", "rendimiento actual de su negocio", MappingKind.LIKERT),
            new FieldMappingDefinition("importancia_formacion_emprendimiento", "importancia de ingeniería de sistemas", MappingKind.LIKERT),
            new FieldMappingDefinition("razon_no_trabaja", "razón por la que actualmente no trabaja", MappingKind.TEXT),
            new FieldMappingDefinition("tiene_formacion_complementaria", "ha realizado o se encuentra realizando", MappingKind.BOOLEAN),
            new FieldMappingDefinition("interes_posgrado", "estaría interesado en realizar estudios", MappingKind.BOOLEAN),
            new FieldMappingDefinition("experiencia_laboral_previa", "ha tenido algún trabajo antes", MappingKind.BOOLEAN),
            new FieldMappingDefinition("es_primer_empleo", "el trabajo que ejerce actualmente es su primer empleo", MappingKind.BOOLEAN),
            new FieldMappingDefinition("primera_experiencia_laboral", "primer empleo", MappingKind.BOOLEAN),
            new FieldMappingDefinition("anios_vida_profesional", "años de vida profesional", MappingKind.NUMBER),
            new FieldMappingDefinition("anios_desempleo", "cantidad corresponde al total de tiempo", MappingKind.NUMBER),
            new FieldMappingDefinition("cantidad_empleos", "en cuántos empleos usted se ha desempeñado", MappingKind.TEXT),
            new FieldMappingDefinition("tiempo_primer_empleo", "cuánto tiempo se demoró en conseguir su primer trabajo", MappingKind.TEXT),
            new FieldMappingDefinition("competencia_faltante", "qué competencia le hizo más falta", MappingKind.TEXT),
            new FieldMappingDefinition("situacion_laboral_actual", "situación laboral actual", MappingKind.LABOR_STATUS)
    );

    @Override
    public Map<String, Object> map(List<String> headers, CSVRecord record, List<FieldMappingSupport.MappingIssue> issues) {
        Map<String, Object> values = FieldMappingSupport.baseValues(headers, record);
        applyMappings(values, headers, record, DEFINITIONS, issues);
        canonicalizeEducationLevel(values);
        inferLaborStatusWhenMissing(values);
        if (!isUnemployed(headers, record)) {
            values.remove("razon_no_trabaja");
            values.remove("experiencia_laboral_previa");
            values.remove("anios_desempleo");
        }
        applyBranchGuards(values);
        return values;
    }

    private void canonicalizeEducationLevel(Map<String, Object> values) {
        Object raw = values.get("formacion_complementaria_nivel");
        if (raw == null) return;
        String normalized = FieldMappingSupport.matchable(String.valueOf(raw)).replace(" ", "");
        String canonical = switch (normalized) {
            case "diplomado" -> "Diplomado";
            case "especialidad" -> "Especialidad";
            case "maestria" -> "Maestría";
            case "doctorado" -> "Doctorado";
            case "posdoctorado", "posdoctor" -> "Posdoctorado";
            default -> String.valueOf(raw).trim();
        };
        values.put("formacion_complementaria_nivel", canonical);
    }

    private void applyBranchGuards(Map<String, Object> values) {
        String status = String.valueOf(values.getOrDefault("situacion_laboral_actual", "")).toLowerCase();
        boolean organization = status.contains("organización") || status.contains("organizacion") || status.contains("empresa");
        if (!organization) {
            List.of("sector_trabajo", "sector_trabajo_actual", "rubro_trabajo_actual", "remuneracion_rango", "area_trabajo",
                    "cargo_actual", "pertinencia_trabajo_formacion", "departamento_trabajo",
                    "medio_obtencion_empleo", "antiguedad_trabajo").forEach(values::remove);
        }

        if (!Boolean.TRUE.equals(values.get("interes_posgrado"))) {
            List.of("nivel_posgrado_interes", "area_posgrado_interes", "modalidad_posgrado",
                    "institucion_posgrado_interes", "financiamiento_posgrado_estimado").forEach(values::remove);
        }

        boolean unemployed = status.contains("no trabaja") || status.contains("no trabajo")
                || status.contains("desemple") || status.contains("busqueda");
        boolean firstEmployment = Boolean.TRUE.equals(values.get("es_primer_empleo"));
        boolean previousWork = Boolean.TRUE.equals(values.get("experiencia_laboral_previa"));
        if (unemployed) values.remove("es_primer_empleo");
        if (!(firstEmployment || (unemployed && previousWork))) {
            values.remove("tiempo_primer_empleo");
            values.remove("cantidad_empleos");
        }
    }

    private void inferLaborStatusWhenMissing(Map<String, Object> values) {
        if (values.containsKey("situacion_laboral_actual")) return;
        boolean hasCurrentWorkData = List.of("sector_trabajo", "vinculo_laboral", "area_trabajo",
                        "cargo_actual", "rubro_empresa")
                .stream()
                .anyMatch(values::containsKey);
        if (hasCurrentWorkData) values.put("situacion_laboral_actual", "Trabaja en una organización");
    }

    private boolean isUnemployed(List<String> headers, CSVRecord record) {
        String status = FieldMappingSupport.firstValue(headers, record, "situación laboral actual");
        if (status == null) return false;
        String normalized = FieldMappingSupport.matchable(status);
        return normalized.contains("no trabaja") || normalized.contains("no trabajo")
                || normalized.contains("busqueda") || normalized.contains("desemple");
    }

    @Override
    public List<GridMappingDefinition> gridDefinitions() {
        return GRID_DEFINITIONS;
    }
}
