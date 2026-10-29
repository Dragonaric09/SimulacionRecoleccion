package com.simulacionem.analitica.application.service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Catálogo de variables analizables de la encuesta de empleadores (resultado del análisis del instrumento,
 * ver docs/analisis-encuesta-empleadores.md). Cada variable declara su nivel de medición y el orden de sus
 * categorías: de eso dependen el gráfico adecuado y la prueba estadística de los cruces.
 *
 * Quedan fuera, a propósito: los datos de identificación (nombre, NIT, razón social, representante,
 * WhatsApp, página web, dirección) y las preguntas de texto libre (áreas emergentes, herramientas,
 * habilidades, competencia faltante, área y cargo del representante), que necesitan codificación cualitativa.
 */
public final class EmployerVariableCatalog {

    private EmployerVariableCatalog() { }

    /** Nivel de medición. BINARIA es nominal con dos categorías; MULTIPLE admite selecciones que se solapan. */
    public enum Level { NOMINAL, BINARIA, ORDINAL, MULTIPLE }

    /**
     * @param expression expresión SQL fija sobre {@code s} (survey_response) y {@code e} (employer_response)
     * @param categories categorías en orden: el de la escala para ordinales, el del formulario para nominales
     * @param chart      gráfico recomendado para la variable sola
     */
    public record Variable(String key, String label, String group, Level level, String expression,
                           List<String> categories, String chart, String description) { }

    public static final List<String> AGREEMENT = List.of("Totalmente desacuerdo", "Parcialmente de acuerdo", "Totalmente de acuerdo");
    public static final List<String> SUFFICIENCY = List.of("1 - Muy insuficiente", "2 - Insuficiente", "3 - Aceptable", "4 - Suficiente", "5 - Muy suficiente");

    private static final String BAR_SORTED = "Barras horizontales ordenadas por frecuencia";
    private static final String BAR_SCALE = "Barras en el orden de la escala";
    private static final String DONUT = "Dona o barras de dos categorías";
    private static final String DIVERGING = "Barras apiladas divergentes (acuerdo a la derecha, desacuerdo a la izquierda)";

    /** Afirmaciones de valoración: posición en employer_response.valuations (1..18), clave y etiqueta corta. */
    public static final List<String[]> VALUATION_ITEMS = List.of(
            new String[]{"valoracion_formacion_1", "Brinda confianza"},
            new String[]{"valoracion_formacion_2", "Título consistente con competencias"},
            new String[]{"valoracion_formacion_3", "Autoridades consultan la opinión"},
            new String[]{"valoracion_formacion_4", "Conoce el perfil de egreso"},
            new String[]{"valoracion_formacion_5", "Perfil coherente con el desempeño"},
            new String[]{"valoracion_formacion_6", "Formación permite desempeño destacado"},
            new String[]{"valoracion_formacion_7", "Incorpora necesidades del sector"},
            new String[]{"valoracion_formacion_8", "Evidencia competencias laborales"},
            new String[]{"valoracion_formacion_9", "Valores y actitudes de los titulados"},
            new String[]{"valoracion_formacion_10", "Participa en retroalimentación"},
            new String[]{"valoracion_relacion_1", "Mantiene vínculos con organizaciones"},
            new String[]{"valoracion_relacion_2", "Participa en vinculación con el entorno"},
            new String[]{"valoracion_relacion_3", "Participa en difusión de oportunidades"},
            new String[]{"valoracion_relacion_4", "Participa en vinculación profesional"},
            new String[]{"valoracion_relacion_5", "Ha sido consultado sobre el desempeño"},
            new String[]{"valoracion_relacion_6", "Consulta sobre pertinencia de la formación"},
            new String[]{"valoracion_relacion_7", "Recurre a la Universidad para contratar"},
            new String[]{"valoracion_relacion_8", "Es consultado periódicamente"});

    /** Competencias del catálogo V1: código y nombre corto. */
    public static final List<String[]> COMPETENCES = List.of(
            new String[]{"programacion_software", "Programación"},
            new String[]{"bases_datos", "Bases de datos"},
            new String[]{"redes_infraestructura", "Redes"},
            new String[]{"seguridad_informatica", "Seguridad"},
            new String[]{"analisis_datos", "Análisis de datos"},
            new String[]{"ingenieria_requisitos", "Requisitos y modelado"},
            new String[]{"gestion_proyectos", "Gestión de proyectos"},
            new String[]{"cloud_devops", "Cloud / DevOps"},
            new String[]{"comunicacion", "Comunicación"},
            new String[]{"trabajo_equipo", "Trabajo en equipo"},
            new String[]{"resolucion_problemas", "Resolución de problemas"},
            new String[]{"liderazgo", "Liderazgo"},
            new String[]{"ingles_tecnico", "Inglés técnico"},
            new String[]{"aprendizaje_autonomo", "Aprendizaje autónomo"});

    public static final List<Variable> VARIABLES = build();

    private static final Map<String, Variable> BY_KEY = index();

    public static Optional<Variable> find(String key) {
        return Optional.ofNullable(key == null ? null : BY_KEY.get(key));
    }

    private static List<Variable> build() {
        List<Variable> list = new ArrayList<>();
        String org = "Organización";
        list.add(new Variable("tipo_organizacion", "Tipo de organización", org, Level.BINARIA, "e.organization_type",
                List.of("Público", "Privado"), DONUT, "Naturaleza jurídica de la organización."));
        list.add(new Variable("tamano_organizacion", "Tamaño de la organización", org, Level.ORDINAL, "e.organization_size",
                List.of("Micro (hasta 10 funcionarios)", "Pequeña (entre 11 a 30 funcionarios)",
                        "Mediana (entre 31 a 99 funcionarios)", "Grande (100 funcionarios o más)"),
                BAR_SCALE, "Número de funcionarios, de Micro a Grande."));
        list.add(new Variable("rubro_organizacion", "Rubro o sector principal", org, Level.NOMINAL, "e.organization_sector",
                List.of("Desarrollo de software", "Servicios de tecnologías de información (TI)", "Telecomunicaciones y redes",
                        "Soporte técnico y mantenimiento de sistemas", "Consultoría en sistemas / transformación digital",
                        "Banca y servicios financieros", "Instituciones públicas / gobierno", "Educación e investigación",
                        "Industria y manufactura", "Comercio y comercio electrónico", "Salud",
                        "Seguridad informática / ciberseguridad", "Análisis de datos / inteligencia de negocios",
                        "Startups o emprendimientos tecnológicos", "Otros"),
                BAR_SORTED, "15 rubros del formulario; con muestras chicas conviene agruparlos."));
        list.add(new Variable("departamento_organizacion", "Departamento", org, Level.NOMINAL, "e.organization_department",
                List.of("La Paz", "Cochabamba", "Oruro", "Potosi", "Sucre", "Tarija", "Santa Cruz", "Beni", "Pando"),
                BAR_SORTED, "Departamento de la sede de la organización."));
        list.add(new Variable("presencia_sedes", "Presencia de sedes", org, Level.ORDINAL, "e.branch_presence",
                List.of("Solo sede central", "Varias sedes en Bolivia", "Sedes en Bolivia y el exterior"),
                BAR_SCALE, "Alcance territorial, de menor a mayor."));
        list.add(new Variable("antiguedad_organizacion", "Antigüedad de la organización", org, Level.ORDINAL,
                "CASE WHEN e.founded_year IS NULL THEN NULL"
                        + " WHEN EXTRACT(YEAR FROM COALESCE(s.submitted_at, now())) - e.founded_year < 5 THEN 'Menos de 5 años'"
                        + " WHEN EXTRACT(YEAR FROM COALESCE(s.submitted_at, now())) - e.founded_year < 15 THEN '5 a 14 años'"
                        + " WHEN EXTRACT(YEAR FROM COALESCE(s.submitted_at, now())) - e.founded_year < 30 THEN '15 a 29 años'"
                        + " ELSE '30 años o más' END",
                List.of("Menos de 5 años", "5 a 14 años", "15 a 29 años", "30 años o más"),
                BAR_SCALE, "Derivada del año de inicio de operaciones, al momento de responder."));

        String hiring = "Contratación";
        list.add(new Variable("contrato_titulados_ultimos_5_anios", "Contrató en los últimos 5 años", hiring, Level.BINARIA,
                "CASE WHEN e.hired_graduates_last_five_years IS NULL THEN NULL WHEN e.hired_graduates_last_five_years THEN 'Sí' ELSE 'No' END",
                List.of("Sí", "No"), DONUT, "Si la organización contrató ingenieros de la Carrera en los últimos 5 años."));
        list.add(new Variable("posibilidad_incorporacion", "Posibilidad de contratar", hiring, Level.ORDINAL, "e.hiring_probability",
                List.of("No requiere profesionales del área de Sistemas", "No se tiene prevista la contratación actualmente",
                        "Sí, dependiendo del crecimiento o nuevos proyectos de la organización",
                        "Sí, existe una alta probabilidad de contratación"),
                BAR_SCALE, "Intención de contratar, de menor a mayor."));
        list.add(new Variable("nivel_formacion_demandado", "Nivel de formación que demanda", hiring, Level.ORDINAL,
                "e.demanded_training_level",
                List.of("Licenciatura", "Diplomado", "Especialidad", "Maestría", "Doctorado", "Post- doctorado"),
                BAR_SCALE, "Nivel académico exigido para contratar, de menor a mayor."));
        list.add(new Variable("medio_convocatoria", "Medio de convocatoria", hiring, Level.MULTIPLE, "e.channel",
                List.of("Medios escritos y audiovisuales", "Internet y Redes sociales",
                        "Postulación competitiva (convocatorias públicas y privadas)", "Oferta profesional personal",
                        "Recomendación de terceros", "Otros"),
                "Barras horizontales independientes por canal", "Canales que la organización puede seleccionar en conjunto."));
        list.add(new Variable("cargo_maximo", "Cargo de mayor nivel de los titulados", hiring, Level.ORDINAL,
                "CASE e.top_position_rank WHEN 1 THEN 'Apoyo / asistencia' WHEN 2 THEN 'Técnico' WHEN 3 THEN 'Analista'"
                        + " WHEN 4 THEN 'Especialista' WHEN 5 THEN 'Supervisión / coordinación' WHEN 6 THEN 'Jefatura o gerencia' END",
                List.of("Apoyo / asistencia", "Técnico", "Analista", "Especialista", "Supervisión / coordinación", "Jefatura o gerencia"),
                BAR_SCALE, "Derivada de la pregunta de casillas sobre cargos: el más alto que marcó la organización."
                        + " «Consultor tecnológico» no entra en la jerarquía."));

        for (int i = 0; i < VALUATION_ITEMS.size(); i++) {
            String[] item = VALUATION_ITEMS.get(i);
            int position = i + 1;
            list.add(new Variable(item[0], item[1],
                    item[0].contains("formacion") ? "Valoración: formación y perfil" : "Valoración: relación con la Carrera",
                    Level.ORDINAL,
                    "CASE e.valuations[" + position + "] WHEN 3 THEN 'Totalmente desacuerdo' WHEN 2 THEN 'Parcialmente de acuerdo'"
                            + " WHEN 1 THEN 'Totalmente de acuerdo' END",
                    AGREEMENT, DIVERGING, "Escala de acuerdo de 3 niveles. «No sabe» queda fuera del cruce."));
        }

        for (String[] competence : COMPETENCES) {
            list.add(new Variable("competencia_" + competence[0], competence[1], "Competencias", Level.ORDINAL,
                    "(SELECT CASE r.numeric_value WHEN 1 THEN '1 - Muy insuficiente' WHEN 2 THEN '2 - Insuficiente'"
                            + " WHEN 3 THEN '3 - Aceptable' WHEN 4 THEN '4 - Suficiente' WHEN 5 THEN '5 - Muy suficiente' END"
                            + " FROM competence_rating r JOIN competence_catalog c ON c.id = r.competence_id"
                            + " WHERE r.response_id = s.id AND c.code = '" + competence[0] + "' AND NOT r.not_observed)",
                    SUFFICIENCY, "Mapa de calor competencia × nivel; barras apiladas al 100 %",
                    "Escala de suficiencia de 1 a 5. «No observado» queda fuera del cruce."));
        }
        list.add(new Variable("competencia_media", "Competencia media (rango)", "Competencias", Level.ORDINAL,
                "CASE WHEN e.competence_average IS NULL THEN NULL WHEN e.competence_average < 2 THEN 'Menos de 2'"
                        + " WHEN e.competence_average < 3 THEN '2 a 2,9' WHEN e.competence_average < 4 THEN '3 a 3,9' ELSE '4 o más' END",
                List.of("Menos de 2", "2 a 2,9", "3 a 3,9", "4 o más"), BAR_SCALE,
                "Promedio de las 14 competencias de cada organización, agrupado en rangos."));
        return List.copyOf(list);
    }

    private static Map<String, Variable> index() {
        Map<String, Variable> map = new LinkedHashMap<>();
        VARIABLES.forEach(v -> map.put(v.key(), v));
        return map;
    }
}
