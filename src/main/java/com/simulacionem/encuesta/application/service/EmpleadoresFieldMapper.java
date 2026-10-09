package com.simulacionem.encuesta.application.service;

import org.apache.commons.csv.CSVRecord;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

import static com.simulacionem.encuesta.application.service.FieldMappingSupport.applyMappings;

@Component
final class EmpleadoresFieldMapper implements SurveyFieldMapper {
    private static final List<GridMappingDefinition> GRID_DEFINITIONS = List.of(
            GridMappingDefinition.competence(),
            GridMappingDefinition.valuation("brinda confianza", "formacion", 1, 1),
            GridMappingDefinition.valuation("titulo profesional otorgado", "formacion", 2, 1),
            GridMappingDefinition.valuation("consultan regularmente nuestra opinion", "formacion", 3, 1),
            GridMappingDefinition.valuation("conozco el perfil profesional", "formacion", 4, 1),
            GridMappingDefinition.valuation("perfil profesional declarado", "formacion", 5, 1),
            GridMappingDefinition.valuation("formacion proporcionada", "formacion", 6, 1),
            GridMappingDefinition.valuation("considera nuestra opinion", "formacion", 7, 1),
            GridMappingDefinition.valuation("desempeno profesional de los titulados", "formacion", 8, 1),
            GridMappingDefinition.valuation("valores y actitudes", "formacion", 9, 1),
            GridMappingDefinition.valuation("procesos de recopilacion", "formacion", 10, 1),
            GridMappingDefinition.valuation("mantiene vinculos", "relacion", 1, 1),
            GridMappingDefinition.valuation("actividades de vinculacion con el entorno", "relacion", 2, 1),
            GridMappingDefinition.valuation("actividades de difusion", "relacion", 3, 1),
            GridMappingDefinition.valuation("vinculacion entre profesionales", "relacion", 4, 1),
            GridMappingDefinition.valuation("como empleador, he sido consultado", "relacion", 5, 1),
            GridMappingDefinition.valuation("ha consultado nuestra opinion", "relacion", 6, 1),
            GridMappingDefinition.valuation("recurrimos a la universidad", "relacion", 7, 1),
            GridMappingDefinition.valuation("consultado periodicamente", "relacion", 8, 1)
    );

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
            new FieldMappingDefinition("cargos_titulados", "tipo de cargos desempeñan los profesionales titulados", MappingKind.TEXT),
            new FieldMappingDefinition("areas_conocimiento_demandadas", "nuevas áreas de conocimiento", MappingKind.TEXT),
            new FieldMappingDefinition("herramientas_tecnologicas_demandadas", "nuevas herramientas tecnológicas", MappingKind.TEXT),
            new FieldMappingDefinition("habilidades_demandadas", "habilidades, competencias y destrezas", MappingKind.TEXT),
            new FieldMappingDefinition("competencia_faltante_titulados", "qué competencia considera que más les falta", MappingKind.TEXT),
            new FieldMappingDefinition("contrato_titulados_ultimos_5_anios", "ha contratado ingenieros", MappingKind.BOOLEAN)
    );

    @Override
    public Map<String, Object> map(List<String> headers, CSVRecord record, List<FieldMappingSupport.MappingIssue> issues) {
        Map<String, Object> values = FieldMappingSupport.baseValues(headers, record);
        applyMappings(values, headers, record, DEFINITIONS, issues);
        return values;
    }

    @Override
    public List<GridMappingDefinition> gridDefinitions() {
        return GRID_DEFINITIONS;
    }
}
