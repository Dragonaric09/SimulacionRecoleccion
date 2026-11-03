package com.simulacionem.encuesta.application.service;

import com.simulacionem.SimulacionEmApplication;
import com.simulacionem.encuesta.application.dto.ImportIssueDto;
import com.simulacionem.encuesta.application.dto.ImportReportDto;
import com.simulacionem.encuesta.infrastructure.persistence.repository.DatasetImportRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Importación completa, contra la base, de los dos formatos inconsistentes que entregó el docente. Los archivos de
 * src/test/resources/encuesta son sintéticos (sin datos reales) pero copian su estructura: la exportación de
 * Microsoft Forms con columnas «Puntos:»/«Comentarios:» y la versión «II» de empleadores sin competencias.
 * Cubre el camino que {@code CsvImportServiceTest} solo prueba con los CSV privados de data/.
 */
@SpringBootTest(classes = SimulacionEmApplication.class)
@ActiveProfiles("dev")
class CsvImportFormatsTest {

    @Autowired
    private CsvImportService service;

    @Autowired
    private DatasetImportRepository datasets;

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void importaTituladosDeMicrosoftFormsDescartandoLasColumnasDeCalificacion() throws IOException {
        ImportReportDto report = importResource("titulados_msforms.csv");
        try {
            assertThat(report.surveyType()).isEqualTo("TITULADOS");
            assertThat(report.rowsRead()).isEqualTo(3);
            assertThat(report.rowsValid()).isEqualTo(3);
            assertThat(messages(report, "COLUMNAS_DESCARTADAS")).singleElement().asString()
                    .contains("Microsoft Forms", "se descartaron 30 columnas", "13 «Puntos: …»", "13 «Comentarios: …»");
            assertThat(messages(report, "PREGUNTA_AUSENTE")).anyMatch(message -> message.contains("Año de titulación"))
                    .anyMatch(message -> message.contains("Competencias técnicas y transversales"));

            UUID id = report.datasetId();
            assertThat(count("SELECT count(*) FROM dataset_column_mapping WHERE dataset_id = ? AND mapping_status = 'EXCLUDED'"
                    + " AND source_column_name LIKE 'Puntos:%'", id)).isEqualTo(13);
            // La respuesta vacía de remuneración ya no toma el 0 de «Puntos: …».
            assertThat(value(id, 2, "remuneracion_rango")).isNull();
            assertThat(value(id, 1, "remuneracion_rango")).isEqualTo("Más de Bs. 10.000");
            assertThat(count("SELECT count(*) FROM survey_response s, jsonb_each_text(s.normalized_payload) e(k, v)"
                    + " WHERE s.dataset_id = ? AND k NOT LIKE 'column_%' AND v = '0' AND k <> 'anios_desempleo'", id)).isZero();
            // Encabezado con otra redacción, casillas en arreglo JSON, sector en mayúsculas y tiempo en meses.
            assertThat(value(id, 1, "pertinencia_trabajo_formacion")).isEqualTo("De acuerdo");
            assertThat(value(id, 1, "area_trabajo")).isEqualTo("Desarrollo; Computo");
            assertThat(value(id, 1, "sector_trabajo")).isEqualTo("Privado");
            assertThat(value(id, 3, "anios_desempleo")).isEqualTo("0.5");
        } finally {
            if (report.datasetId() != null) datasets.deleteById(report.datasetId());
        }
    }

    @Test
    void importaEmpleadoresDeOtraVersionAdvirtiendoLoQueFalta() throws IOException {
        ImportReportDto report = importResource("empleadores_v2.csv");
        try {
            assertThat(report.surveyType()).isEqualTo("EMPLEADORES");
            assertThat(report.rowsValid()).isEqualTo(3);
            assertThat(report.rowsRejected()).isZero();
            assertThat(messages(report, "PREGUNTA_AUSENTE")).hasSize(4)
                    .anyMatch(message -> message.contains("Competencias valoradas"))
                    .anyMatch(message -> message.contains("Departamento de la organización"));
            // Un valor fuera de la escala de acuerdo se informa en lugar de perderse.
            assertThat(messages(report, "VALOR_FUERA_DE_ESCALA")).singleElement().asString().contains("«Muy de acuerdo»");
            assertThat(messages(report, "COMPETENCIAS_VACIAS")).isEmpty();
            assertThat(count("SELECT count(*) FROM employer_response e JOIN survey_response s ON s.id = e.response_id"
                    + " WHERE s.dataset_id = ? AND e.hired_graduates_last_five_years", report.datasetId())).isEqualTo(2);
        } finally {
            if (report.datasetId() != null) datasets.deleteById(report.datasetId());
        }
    }

    @Test
    void rechazaUnArchivoQueNoCorrespondeAlInstrumento() throws IOException {
        StringBuilder csv = new StringBuilder("Marca temporal,Edad que tiene actualmente:");
        for (int i = 0; i < 12; i++) csv.append(",Pregunta ").append(i);
        csv.append("\n1/1/2026 10:00:00,23 - 26 años").append(",x".repeat(12)).append('\n');

        ImportReportDto report = service.validate(new MockMultipartFile("file", "ajeno.csv", "text/csv", csv.toString().getBytes()));

        assertThat(report.status()).isEqualTo("CON_ERRORES");
        assertThat(report.issues()).extracting(ImportIssueDto::code).containsExactly("INSTRUMENTO_NO_RECONOCIDO");
    }

    private ImportReportDto importResource(String name) throws IOException {
        try (InputStream input = getClass().getResourceAsStream("/encuesta/" + name)) {
            assertThat(input).as("recurso %s", name).isNotNull();
            // Nombre único: el importador rechaza un archivo ya importado por su huella, no por el nombre.
            return service.importFile(new MockMultipartFile("file", name, "text/csv", input.readAllBytes()));
        }
    }

    private static List<String> messages(ImportReportDto report, String code) {
        return report.issues().stream().filter(issue -> issue.code().equals(code)).map(ImportIssueDto::message).toList();
    }

    private long count(String sql, UUID datasetId) {
        Long value = jdbc.queryForObject(sql, Long.class, datasetId);
        return value == null ? 0 : value;
    }

    private String value(UUID datasetId, int sourceRow, String key) {
        List<String> values = jdbc.queryForList("SELECT normalized_payload ->> ? FROM survey_response"
                + " WHERE dataset_id = ? AND source_row_number = ?", String.class, key, datasetId, sourceRow + 1);
        return values.isEmpty() ? null : values.get(0);
    }
}
