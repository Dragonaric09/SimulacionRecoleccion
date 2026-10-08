package com.simulacionem.encuesta.infrastructure.persistence.repository;

import com.simulacionem.encuesta.infrastructure.persistence.entity.SurveyResponseEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface SurveyResponseRepository extends JpaRepository<SurveyResponseEntity, UUID> {
    long countByDataset_Id(UUID datasetId);
}
