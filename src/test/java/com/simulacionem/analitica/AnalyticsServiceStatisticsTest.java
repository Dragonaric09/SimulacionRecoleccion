package com.simulacionem.analitica;

import com.simulacionem.analitica.application.dto.CompetenceAverageDto;
import com.simulacionem.analitica.application.dto.EmploymentProfileDto;
import com.simulacionem.encuesta.infrastructure.persistence.entity.SurveyResponseEntity;
import com.simulacionem.analitica.application.service.AnalyticsService;
import com.simulacionem.encuesta.infrastructure.persistence.entity.CompetenceCatalogEntity;
import com.simulacionem.encuesta.infrastructure.persistence.entity.CompetenceRatingEntity;
import com.simulacionem.encuesta.infrastructure.persistence.entity.DatasetImportEntity;
import com.simulacionem.encuesta.infrastructure.persistence.repository.CompetenceRatingRepository;
import com.simulacionem.encuesta.infrastructure.persistence.repository.DatasetImportRepository;
import com.simulacionem.encuesta.infrastructure.persistence.repository.SurveyResponseRepository;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AnalyticsServiceStatisticsTest {
    @Test
    void ignoraValoresNulosAlConstruirPerfilDeEmpleabilidad() {
        UUID datasetId = UUID.randomUUID();
        DatasetImportEntity dataset = mock(DatasetImportEntity.class);
        when(dataset.getId()).thenReturn(datasetId);
        Map<String, Object> incomplete = new HashMap<>();
        incomplete.put("anio_titulacion", null);
        incomplete.put("anios_vida_profesional", " 4 ");
        Map<String, Object> complete = new HashMap<>();
        complete.put("anio_titulacion", "2022");
        complete.put("anios_vida_profesional", "3");
        SurveyResponseEntity incompleteResponse = new SurveyResponseEntity(dataset, "TITULADOS", 2, "VALIDA", incomplete);
        SurveyResponseEntity completeResponse = new SurveyResponseEntity(dataset, "TITULADOS", 3, "VALIDA", complete);
        DatasetImportRepository datasets = mock(DatasetImportRepository.class);
        SurveyResponseRepository responses = mock(SurveyResponseRepository.class);
        CompetenceRatingRepository ratings = mock(CompetenceRatingRepository.class);
        when(datasets.findById(datasetId)).thenReturn(Optional.of(dataset));
        when(responses.findByDataset_IdAndResponseStatus(datasetId, "VALIDA")).thenReturn(List.of(incompleteResponse, completeResponse));

        EmploymentProfileDto result = new AnalyticsService(datasets, responses, ratings).employmentProfile(datasetId);

        assertThat(result.validResponses()).isEqualTo(2);
        assertThat(result.cohortPoints()).singleElement().satisfies(point -> {
            assertThat(point.graduationYear()).isEqualTo(2022);
            assertThat(point.professionalYears()).isEqualTo(3);
        });
    }

    @Test
    void excluyeNoObservadoYUsaDesviacionMuestral() {
        UUID datasetId = UUID.randomUUID();
        DatasetImportEntity dataset = mock(DatasetImportEntity.class);
        CompetenceCatalogEntity competence = mock(CompetenceCatalogEntity.class);
        CompetenceRatingEntity observed = mock(CompetenceRatingEntity.class);
        CompetenceRatingEntity notObserved = mock(CompetenceRatingEntity.class);
        when(competence.getCode()).thenReturn("comunicacion");
        when(dataset.getId()).thenReturn(datasetId);
        when(competence.getName()).thenReturn("Comunicación oral y escrita");
        when(competence.getCompetenceGroup()).thenReturn("SOFT_SKILL");
        when(observed.getCompetence()).thenReturn(competence);
        when(observed.isNotObserved()).thenReturn(false);
        when(observed.getNumericValue()).thenReturn((short) 4);
        when(notObserved.getCompetence()).thenReturn(competence);
        when(notObserved.isNotObserved()).thenReturn(true);
        when(notObserved.getNumericValue()).thenReturn(null);

        DatasetImportRepository datasets = mock(DatasetImportRepository.class);
        SurveyResponseRepository responses = mock(SurveyResponseRepository.class);
        CompetenceRatingRepository ratings = mock(CompetenceRatingRepository.class);
        when(datasets.findById(datasetId)).thenReturn(Optional.of(dataset));
        when(ratings.findByResponse_Dataset_Id(datasetId)).thenReturn(List.of(observed, notObserved));

        List<CompetenceAverageDto> result = new AnalyticsService(datasets, responses, ratings).competenceGaps(datasetId);

        assertThat(result).singleElement().satisfies(item -> {
            assertThat(item.validCount()).isEqualTo(1);
            assertThat(item.average()).isEqualTo(4.0);
            assertThat(item.standardDeviation()).isNull();
        });
    }
}
