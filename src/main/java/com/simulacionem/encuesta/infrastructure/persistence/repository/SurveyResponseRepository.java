package com.simulacionem.encuesta.infrastructure.persistence.repository;

import com.simulacionem.encuesta.infrastructure.persistence.entity.SurveyResponseEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface SurveyResponseRepository extends JpaRepository<SurveyResponseEntity, UUID> {
    long countByDataset_Id(UUID datasetId);
    java.util.Optional<SurveyResponseEntity> findByDataset_IdAndSourceRowNumber(UUID datasetId, int sourceRowNumber);
    java.util.List<SurveyResponseEntity> findByDataset_IdAndResponseStatus(UUID datasetId, String responseStatus);
    java.util.List<SurveyResponseEntity> findByDataset_Id(UUID datasetId);
}
