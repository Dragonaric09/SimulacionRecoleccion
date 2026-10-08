package com.simulacionem.analitica;

import com.simulacionem.analitica.application.dto.CompetenceAverageDto;
import com.simulacionem.analitica.application.service.AnalyticsService;
import com.simulacionem.encuesta.infrastructure.persistence.entity.CompetenceCatalogEntity;
import com.simulacionem.encuesta.infrastructure.persistence.entity.CompetenceRatingEntity;
import com.simulacionem.encuesta.infrastructure.persistence.entity.DatasetImportEntity;
import com.simulacionem.encuesta.infrastructure.persistence.repository.CompetenceRatingRepository;
import com.simulacionem.encuesta.infrastructure.persistence.repository.DatasetImportRepository;
import com.simulacionem.encuesta.infrastructure.persistence.repository.SurveyResponseRepository;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AnalyticsServiceStatisticsTest {
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
