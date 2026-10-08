package com.simulacionem.encuesta.infrastructure.persistence;

import com.simulacionem.SimulacionEmApplication;
import com.simulacionem.encuesta.infrastructure.persistence.entity.DatasetImportEntity;
import com.simulacionem.encuesta.infrastructure.persistence.entity.SurveyResponseEntity;
import com.simulacionem.encuesta.infrastructure.persistence.repository.DatasetImportRepository;
import com.simulacionem.encuesta.infrastructure.persistence.repository.SurveyResponseRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(classes = SimulacionEmApplication.class)
@ActiveProfiles("dev")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class DatasetPersistenceTest {

    @Autowired
    private DatasetImportRepository datasetImports;

    @Autowired
    private SurveyResponseRepository responses;

    @Test
    void guardaYConsultaUnDatasetAnonimoConSuRespuesta() {
        var dataset = datasetImports.saveAndFlush(
                new DatasetImportEntity("TITULADOS", "fixture-fase-2.csv", "LISTO"));
        dataset.setRowsRead(1);
        dataset.setRowsValid(1);
        datasetImports.saveAndFlush(dataset);

        responses.saveAndFlush(new SurveyResponseEntity(
                dataset,
                "TITULADOS",
                2,
                "VALIDA",
                Map.of("programa", "Ingeniería de Sistemas", "anonimo", true)));

        var persisted = datasetImports.findById(dataset.getId()).orElseThrow();
        assertThat(persisted.getSurveyType()).isEqualTo("TITULADOS");
        assertThat(persisted.getRowsRead()).isEqualTo(1);
        assertThat(responses.countByDataset_Id(dataset.getId())).isEqualTo(1);

        datasetImports.deleteById(dataset.getId());
        datasetImports.flush();
    }
}
