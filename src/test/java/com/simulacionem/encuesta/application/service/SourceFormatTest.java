package com.simulacionem.encuesta.application.service;

import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVRecord;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.StringReader;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/** Discriminación del formato de origen y control de inconsistencias de los archivos del docente. */
class SourceFormatTest {

    /** Encabezados con la forma de la exportación de MS Forms (cuestionario) del archivo de titulados. */
    private static final List<String> MS_FORMS = List.of(
            "Id", "Hora de inicio", "Hora de finalización", "Correo electrónico", "Nombre", "Total de puntos",
            "Comentarios del cuestionario", "Hora de publicación de la calificación",
            "Edad que tiene actualmente:", "Puntos: Edad que tiene actualmente:", "Comentarios: Edad que tiene actualmente:",
            "Señale la remuneración promedio mensual que está percibiendo en su actual trabajo.",
            "Puntos: Señale la remuneración promedio mensual que está percibiendo en su actual trabajo.",
            "Comentarios: Señale la remuneración promedio mensual que está percibiendo en su actual trabajo.",
            "Puntos: Column", "Comentarios: Column");

    @Test
    void descartaLasColumnasDeCalificacionDeMicrosoftForms() {
        SourceFormat format = SourceFormat.analyze(MS_FORMS);

        assertThat(format.origin()).isEqualTo(SourceFormat.Origin.MICROSOFT_FORMS);
        List<String> kept = format.analyzableHeaders().stream().filter(java.util.Objects::nonNull).toList();
        assertThat(kept).containsExactly("Hora de inicio", "Hora de finalización", "Correo electrónico", "Nombre",
                "Edad que tiene actualmente:", "Señale la remuneración promedio mensual que está percibiendo en su actual trabajo.");
        // La numeración original se conserva: la columna 9 sigue siendo la edad.
        assertThat(format.analyzableHeaders()).hasSize(MS_FORMS.size());
        assertThat(format.analyzableHeaders().get(8)).isEqualTo("Edad que tiene actualmente:");
        assertThat(format.discardSummary()).contains("Microsoft Forms", "3 «Puntos: …»", "3 «Comentarios: …»", "«Total de puntos»");
    }

    @Test
    void noDescartaNadaEnUnArchivoDeGoogleForms() {
        List<String> google = List.of("Marca temporal", "2) Tipo de organización", "Comentarios: sugerencias para la Carrera");
        SourceFormat format = SourceFormat.analyze(google);

        assertThat(format.origin()).isEqualTo(SourceFormat.Origin.GOOGLE_FORMS);
        // Sin el formato de MS Forms, una pregunta que empieza con «Comentarios:» es una respuesta legítima.
        assertThat(format.analyzableHeaders()).containsExactlyElementsOf(google);
        assertThat(format.discardSummary()).isNull();
    }

    @Test
    void avisaSiUnaColumnaDePuntajeTraeTexto() throws IOException {
        SourceFormat format = SourceFormat.analyze(MS_FORMS);
        CSVRecord first = record("1,a,b,c,d,,,,35 años o más,0,,Más de Bs. 10.000,0,,0,");
        CSVRecord second = record("2,a,b,c,d,,,,35 años o más,Sí respondí aquí,,Más de Bs. 10.000,0,,0,");

        assertThat(format.unexpectedContent(first)).isEmpty();
        assertThat(format.unexpectedContent(second)).containsExactly(9);
        // Se informa una sola vez por columna.
        assertThat(format.unexpectedContent(second)).isEmpty();
    }

    @Test
    void lasRespuestasVaciasYaNoToman0DeLaColumnaPuntos() throws IOException {
        SourceFormat format = SourceFormat.analyze(MS_FORMS);
        // Remuneración vacía: antes «Puntos: Señale la remuneración…» coincidía con la pregunta y aportaba su 0.
        CSVRecord row = record("1,a,b,c,d,,,,35 años o más,0,,,0,,0,");
        String value = FieldMappingSupport.firstValue(format.analyzableHeaders(), row, "remuneración promedio mensual");

        assertThat(value).isNull();
    }

    @Test
    void interpretaElTiempoEnMesesYTextosSinCifras() {
        assertThat(FieldMappingSupport.yearsOrNumber("3")).isEqualTo(3.0);
        assertThat(FieldMappingSupport.yearsOrNumber("1 año")).isEqualTo(1.0);
        assertThat(FieldMappingSupport.yearsOrNumber("6 meses")).isEqualTo(0.5);
        assertThat(FieldMappingSupport.yearsOrNumber("unos 3 meses")).isEqualTo(0.25);
        assertThat(FieldMappingSupport.yearsOrNumber("ninguno, siempre estuve con trabajo")).isEqualTo(0.0);
        assertThat(FieldMappingSupport.yearsOrNumber("gjvu")).isNull();
    }

    @Test
    void separaLasCasillasExportadasComoArregloJson() throws IOException {
        List<String> headers = List.of("¿Cuál es el área dentro de la organización donde desarrolla sus actividades?");
        Map<String, Object> values = new HashMap<>();
        FieldMappingSupport.putMultiple(values, headers, record("\"[\"\"Desarrollo\"\",\"\"Computo\"\"]\""),
                "area_trabajo", "área dentro de la organización");

        assertThat(values).containsEntry("area_trabajo", "Desarrollo; Computo");
    }

    @Test
    void empleadoresAceptaUnaVersionSinCompetenciasPeroRechazaFilasVacias() {
        EmpleadoresFieldMapper mapper = new EmpleadoresFieldMapper();
        Set<String> withoutCompetences = Set.of("tipo_organizacion", "tamano_organizacion", "rubro_organizacion",
                "contrato_titulados_ultimos_5_anios", "posibilidad_incorporacion", "nivel_formacion_demandado",
                "medio_convocatoria");
        Map<String, Object> answered = new HashMap<>(Map.of("tipo_organizacion", "Privado", "tamano_organizacion",
                "Grande (100 funcionarios o más)", "rubro_organizacion", "Salud", "contrato_titulados_ultimos_5_anios", true,
                "posibilidad_incorporacion", "Sí", "nivel_formacion_demandado", "Licenciatura", "medio_convocatoria", "Otros"));

        assertThat(mapper.validate(answered, 2, withoutCompetences)).isEmpty();
        // Con el instrumento completo, la falta de competencias en la fila sí se advierte (sin rechazarla).
        Set<String> complete = new java.util.HashSet<>(withoutCompetences);
        complete.add("competence:bases_datos");
        assertThat(mapper.validate(answered, 2, complete)).extracting(FieldMappingSupport.MappingIssue::code)
                .containsExactly("COMPETENCIAS_VACIAS");
        assertThat(mapper.validate(new HashMap<>(Map.of("column_3", "x")), 3, withoutCompetences))
                .extracting(FieldMappingSupport.MappingIssue::severity).containsExactly("ERROR");
    }

    @Test
    void avisaUnaValoracionFueraDeLaEscala() {
        Map<String, Object> values = new HashMap<>(Map.of("tipo_organizacion", "Privado",
                "valoracion_formacion_1", "Totalmente de acuerdo", "valoracion_formacion_2", "Muy de acuerdo"));

        assertThat(new EmpleadoresFieldMapper().validate(values, 4, Set.of("tipo_organizacion",
                "valoracion_formacion_1", "valoracion_formacion_2")))
                .filteredOn(issue -> issue.code().equals("VALOR_FUERA_DE_ESCALA"))
                .singleElement()
                .satisfies(issue -> assertThat(issue.message()).contains("«Muy de acuerdo»"));
    }

    @Test
    void informaLasPreguntasDelInstrumentoQueFaltan() {
        List<String> headers = new ArrayList<>(Arrays.asList("Marca temporal", "2)\tTipo de organización",
                "3)\tTamaño de la organización", "4) Indique el rubro o sector principal de la organización",
                "5) ¿La organización ha contratado Ingenieros de la carrera de Sistemas en los últimos 5 años?",
                " [La Carrera de Ingeniería de Sistemas de la Universidad Mayor de San Simón brinda confianza a nuestra organización como formadora de profesionales del área tecnológica.]"));
        List<String> missing = new EmpleadoresFieldMapper().expectedQuestions().stream()
                .filter(question -> !question.presentIn(headers)).map(SurveyFieldMapper.ExpectedQuestion::question).toList();

        assertThat(missing).containsExactly("Departamento de la organización", "Presencia de sedes",
                "Año de inicio de operaciones", "Competencias valoradas (técnicas y transversales)");
    }

    private static CSVRecord record(String line) throws IOException {
        return CSVFormat.DEFAULT.parse(new StringReader(line)).getRecords().get(0);
    }
}
