package com.simulacionem.encuesta.application.service;

import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.junit.jupiter.api.Test;

import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Fixture: cabecera real del formulario de empleadores y dos filas sintéticas.
 * Fila 1 completa; fila 2 sin competencias, igual que la respuesta de prueba del Excel real.
 * Cada valoración de la fila 1 lleva «Val-N» (N = orden en el formulario, 1..18) para comprobar la columna exacta.
 */
class EmpleadoresFieldMapperTest {
    private final EmpleadoresFieldMapper mapper = new EmpleadoresFieldMapper();

    @Test
    void asignaCadaAfirmacionASuClaveSinMezclarLasDeFormacionYRelacion() throws Exception {
        Fixture fixture = fixture();
        Map<String, Object> values = mapper.map(fixture.headers(), fixture.records().get(0), new ArrayList<>());

        assertThat(values).containsEntry("valoracion_formacion_1", "Val-1")
                .containsEntry("valoracion_formacion_2", "Val-2")
                .containsEntry("valoracion_formacion_8", "Val-8")
                .containsEntry("valoracion_relacion_1", "Val-11")
                .containsEntry("valoracion_relacion_5", "Val-15")
                .containsEntry("valoracion_relacion_8", "Val-18");
        assertThat(values.keySet().stream().filter(key -> key.startsWith("valoracion_")).count()).isEqualTo(18);
    }

    @Test
    void competenciasSeAsignanAlCatalogoYConservanNoObservado() throws Exception {
        Map<String, Object> values = mapper.map(fixture().headers(), fixture().records().get(0), new ArrayList<>());

        assertThat(values).containsEntry("competence:programacion_software", "4 - Suficiente")
                .containsEntry("competence:liderazgo", "No observado");
        assertThat(values.keySet().stream().filter(key -> key.startsWith("competence:")).count()).isEqualTo(14);
    }

    @Test
    void casillasDeCargosSeGuardanComoOpcionesMarcadas() throws Exception {
        Map<String, Object> values = mapper.map(fixture().headers(), fixture().records().get(0), new ArrayList<>());

        assertThat(values.get("cargos_titulados")).isEqualTo(
                "Técnico (desarrollo de software, administración de sistemas, redes, bases de datos, soporte TI); "
                        + "Jefatura o Gerencial (gestión de proyectos, dirección de TI, transformación digital)");
    }

    @Test
    void contratacionSeNormalizaABooleano() throws Exception {
        Map<String, Object> values = mapper.map(fixture().headers(), fixture().records().get(0), new ArrayList<>());

        assertThat(values).containsEntry("contrato_titulados_ultimos_5_anios", Boolean.TRUE);
    }

    @Test
    void unaFilaCompletaNoGeneraErrores() throws Exception {
        Fixture fixture = fixture();
        Map<String, Object> values = mapper.map(fixture.headers(), fixture.records().get(0), new ArrayList<>());

        assertThat(mapper.validate(values, 2)).noneMatch(issue -> issue.severity().equals("ERROR"));
    }

    @Test
    void unaFilaSinCompetenciasQuedaFueraDelAnalisis() throws Exception {
        Fixture fixture = fixture();
        Map<String, Object> values = mapper.map(fixture.headers(), fixture.records().get(1), new ArrayList<>());

        assertThat(mapper.validate(values, 3))
                .anyMatch(issue -> issue.severity().equals("ERROR") && issue.code().equals("RESPUESTA_INCOMPLETA"));
    }

    @Test
    void laColumnaDeLaAfirmacionSeIdentificaPorEnunciado() throws Exception {
        String header = fixture().headers().stream()
                .filter(h -> h.contains("Como empleador, he sido consultado sobre"))
                .findFirst().orElseThrow();

        assertThat(mapper.columnKey(header)).isEqualTo("valoracion_relacion_5");
    }

    @Test
    void elInstrumentoTieneDieciochoAfirmacionesYCatorceCompetencias() {
        assertThat(EmpleadoresFieldMapper.VALUATIONS).hasSize(18);
        assertThat(EmpleadoresFieldMapper.COMPETENCE_CODES).hasSize(14);
    }

    @Test
    void losDatosDeIdentificacionSeReconocenSinImportarAcentos() {
        assertThat(FieldMappingSupport.isPersonal("Número telefónico de contacto")).isTrue();
        assertThat(FieldMappingSupport.isPersonal("NIT de la empresa o institucion")).isTrue();
        assertThat(FieldMappingSupport.isPersonal("Nombre de la Empresa o Institución")).isTrue();
        assertThat(FieldMappingSupport.isPersonal("Redes sociales activas")).isFalse();
        assertThat(FieldMappingSupport.isPersonal("Tipo de organización")).isFalse();
    }

    private record Fixture(List<String> headers, List<CSVRecord> records) { }

    private Fixture fixture() throws Exception {
        try (var input = getClass().getResourceAsStream("/encuesta/empleadores_instrumento.csv");
             CSVParser parser = CSVFormat.DEFAULT.builder()
                     .setHeader().setSkipHeaderRecord(true).build()
                     .parse(new InputStreamReader(input, StandardCharsets.UTF_8))) {
            List<String> headers = parser.getHeaderNames();
            return new Fixture(headers, parser.getRecords());
        }
    }
}
