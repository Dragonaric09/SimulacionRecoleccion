package com.simulacionem.encuesta.application.service;

import com.simulacionem.SimulacionEmApplication;
import com.simulacionem.encuesta.application.dto.ImportReportDto;
import com.simulacionem.encuesta.infrastructure.persistence.repository.DatasetImportRepository;
import com.simulacionem.encuesta.infrastructure.persistence.repository.DatasetColumnMappingRepository;
import com.simulacionem.encuesta.infrastructure.persistence.repository.SurveyResponseRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.FileSystemResource;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(classes = SimulacionEmApplication.class)
@ActiveProfiles("dev")
class CsvImportServiceTest {
    @Autowired
    private CsvImportService service;

    @Autowired
    private DatasetImportRepository datasets;

    @Autowired
    private DatasetColumnMappingRepository mappings;

    @Autowired
    private SurveyResponseRepository responses;

    @Test
    void validaEImportaLosDosCsvRealesSinGuardarDatosPersonales() throws IOException {
        Path data = Path.of("data");
        ImportReportDto titulados = importFile(data.resolve("ENCUESTA DE OPINIÓN A TITULADOS DE INGENIERÍA EN SISTEMAS  (respuestas) - Respuestas de formulario 1.csv"));
        ImportReportDto empleadores = importFile(data.resolve("Empleadores - Respuestas de formulario.csv"));

        assertThat(titulados.surveyType()).isEqualTo("TITULADOS");
        assertThat(titulados.rowsRead()).isEqualTo(8);
        assertThat(titulados.rowsValid()).isEqualTo(8);
        assertThat(titulados.warnings()).isGreaterThan(0);
        assertThat(responses.countByDataset_Id(titulados.datasetId())).isEqualTo(8);
        assertThat(mappings.countByDataset_Id(titulados.datasetId())).isEqualTo(85);
        assertThat(empleadores.surveyType()).isEqualTo("EMPLEADORES");
        assertThat(empleadores.rowsRead()).isEqualTo(3);
        assertThat(empleadores.rowsValid()).isEqualTo(3);

        datasets.deleteById(titulados.datasetId());
        datasets.deleteById(empleadores.datasetId());
    }

    @Test
    void rechazaUnaExtensionQueNoSeaCsv() throws IOException {
        ImportReportDto report = service.validate(new MockMultipartFile("file", "datos.txt", "text/plain", "a,b,c".getBytes()));
        assertThat(report.status()).isEqualTo("CON_ERRORES");
        assertThat(report.issues()).anyMatch(issue -> issue.code().equals("EXTENSION_INVALIDA"));
    }

    private ImportReportDto importFile(Path path) throws IOException {
        byte[] content = Files.readAllBytes(path);
        return service.importFile(new MockMultipartFile("file", path.getFileName().toString(), "text/csv", content));
    }
}
