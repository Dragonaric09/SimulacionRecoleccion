package com.simulacionem.analitica.application.service;

import com.simulacionem.analitica.application.service.EmployerVariableCatalog.Level;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Variables de Titulados aptas para inferencia bivariada. Se excluyen preguntas de respuesta múltiple y texto
 * libre: una misma persona puede marcar varias alternativas y por ello no forman una tabla de contingencia válida.
 */
public final class TituladosVariableCatalog {

    private TituladosVariableCatalog() { }

    public record Variable(String key, String label, String group, Level level, List<String> categories,
                           String chart, String description) { }

    private static final List<String> AGE = List.of("15 - 18 años", "19 - 22 años", "23 - 26 años",
            "27 - 30 años", "31 - 34 años", "35 años o más");
    private static final List<String> POSTGRADUATE = List.of("Diplomado", "Especialidad", "Maestría", "Doctorado", "Posdoctorado");
    private static final List<String> SALARY = List.of("Menos de Bs. 2.500", "Bs. 2.500 - 3.500",
            "Bs. 3.501 - 5.000", "Bs. 5.001 - 7.000", "Bs. 7.001 - 10.000", "Más de Bs. 10.000");
    private static final List<String> AGREEMENT = List.of("Totalmente en desacuerdo", "En desacuerdo",
            "De acuerdo", "Totalmente de acuerdo");

    public static final List<Variable> VARIABLES = List.of(
            variable("edad_rango", "Rango de edad", "Perfil", Level.ORDINAL, AGE,
                    "Columnas en el orden de edad", "Tramos de edad en orden ascendente."),
            variable("genero", "Género", "Perfil", Level.NOMINAL, List.of("Mujer", "Hombre"),
                    "Dona o barras agrupadas", "Identidad de género declarada; las categorías no tienen orden."),
            variable("segmento_titulacion", "Segmento de titulación", "Perfil", Level.BINARIA,
                    List.of("Junior / Reciente", "Consolidado"), "Dona o barras de dos categorías",
                    "Segmento derivado del año de titulación; se compara como dos grupos."),
            variable("situacion_laboral_actual", "Estado laboral", "Perfil", Level.NOMINAL,
                    List.of("Trabaja en una organización", "Emprendimiento propio", "En búsqueda laboral"),
                    "Barras agrupadas", "Situación laboral actual; sus categorías no representan una escala."),
            variable("sector_trabajo", "Sector laboral", "Perfil", Level.NOMINAL, List.of(),
                    "Barras horizontales ordenadas", "Sector declarado por la persona titulada."),
            variable("tiene_formacion_complementaria", "Formación complementaria", "Formación", Level.BINARIA,
                    List.of("Sí", "No"), "Dona o barras de dos categorías", "Si realizó o cursa formación complementaria."),
            variable("interes_posgrado", "Interés en posgrado", "Formación", Level.BINARIA,
                    List.of("Sí", "No"), "Dona o barras de dos categorías", "Intención declarada de cursar posgrado."),
            variable("nivel_posgrado_interes", "Nivel de posgrado de interés", "Formación", Level.ORDINAL,
                    POSTGRADUATE, "Columnas en el orden académico", "Nivel académico deseado, de Diplomado a Posdoctorado."),
            variable("modalidad_posgrado", "Modalidad preferida", "Formación", Level.NOMINAL, List.of(),
                    "Barras horizontales ordenadas", "Modalidad de estudio preferida; no tiene orden inherente."),
            variable("financiamiento_posgrado_estimado", "Financiamiento estimado", "Formación", Level.NOMINAL,
                    List.of("Recursos propios", "Beca", "Crédito educativo", "Apoyo de la empresa o institución", "Financiamiento mixto"),
                    "Barras horizontales ordenadas", "Fuente principal prevista para financiar el posgrado."),
            variable("rubro_trabajo_actual", "Rubro de la organización", "Trabajo", Level.NOMINAL, List.of(),
                    "Barras horizontales ordenadas", "Rubro de la organización donde trabaja."),
            variable("remuneracion_rango", "Remuneración mensual", "Trabajo", Level.ORDINAL, SALARY,
                    "Columnas en el orden salarial", "Rangos de remuneración mensual ordenados de menor a mayor."),
            variable("es_primer_empleo", "Es su primer empleo", "Trabajo", Level.BINARIA, List.of("Sí", "No"),
                    "Dona o barras de dos categorías", "Condición de primer empleo entre personas ocupadas."),
            variable("satisfaccion_formacion", "Valoración global de la formación", "Satisfacción", Level.ORDINAL,
                    AGREEMENT, "Barras apiladas en escala de acuerdo", "Grado de acuerdo sobre la valoración global de la formación recibida."),
            variable("concordancia_formacion_requerimientos", "Concordancia formación–requerimientos", "Satisfacción", Level.ORDINAL,
                    AGREEMENT, "Barras apiladas en escala de acuerdo", "Grado de acuerdo sobre la concordancia con los requerimientos profesionales."),
            variable("pertinencia_trabajo_formacion", "Pertinencia del trabajo con la formación", "Satisfacción", Level.ORDINAL,
                    AGREEMENT, "Barras apiladas en escala de acuerdo", "Grado de acuerdo sobre la pertinencia del trabajo actual con la formación."),
            variable("satisfaccion_emprendimiento", "Satisfacción con el emprendimiento", "Emprendimiento", Level.ORDINAL,
                    List.of("Insatisfecho", "Algo satisfecho", "Satisfecho"), "Columnas en el orden de satisfacción", "Satisfacción declarada por quienes tienen emprendimiento."),
            variable("importancia_formacion_emprendimiento", "Importancia de la formación en el emprendimiento", "Emprendimiento", Level.ORDINAL,
                    List.of("No es importante", "Importante", "Muy importante"), "Columnas en el orden de importancia",
                    "Importancia atribuida a la formación para el emprendimiento.")
    );

    private static final Map<String, Variable> BY_KEY = index();

    public static Optional<Variable> find(String key) {
        return Optional.ofNullable(key == null ? null : BY_KEY.get(key));
    }

    private static Variable variable(String key, String label, String group, Level level, List<String> categories,
                                     String chart, String description) {
        return new Variable(key, label, group, level, categories, chart, description);
    }

    private static Map<String, Variable> index() {
        Map<String, Variable> index = new LinkedHashMap<>();
        VARIABLES.forEach(variable -> index.put(variable.key(), variable));
        return Map.copyOf(index);
    }
}
