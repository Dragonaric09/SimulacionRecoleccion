package com.simulacionem.encuesta.infrastructure.persistence;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository
public class EncuestaResponseRepository {

    private static final List<String> TITULADO_COLUMNS = List.of(
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
    );

    private static final List<String> EMPLEADOR_COLUMNS = List.of(
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
    );

    private final JdbcTemplate jdbcTemplate;

    public EncuestaResponseRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public int guardarTitulado(Map<String, Object> valores) {
        return guardar("titulados", TITULADO_COLUMNS, valores);
    }

    public int guardarEmpleador(Map<String, Object> valores) {
        return guardar("empleadores", EMPLEADOR_COLUMNS, valores);
    }

    private int guardar(String tabla, List<String> columnas, Map<String, Object> valores) {
        Object[] parametros = columnas.stream()
                .map(valores::get)
                .toArray();
        String sql = "INSERT INTO " + tabla + " (" + String.join(", ", columnas) + ") VALUES (" + placeholders(columnas.size()) + ")";
        return jdbcTemplate.update(sql, parametros);
    }

    private String placeholders(int total) {
        return String.join(", ", java.util.Collections.nCopies(total, "?"));
    }
}