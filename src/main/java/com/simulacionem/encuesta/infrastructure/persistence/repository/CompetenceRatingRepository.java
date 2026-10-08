package com.simulacionem.encuesta.infrastructure.persistence.repository;

import com.simulacionem.encuesta.infrastructure.persistence.entity.CompetenceRatingEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface CompetenceRatingRepository extends JpaRepository<CompetenceRatingEntity, Long> {
    List<CompetenceRatingEntity> findByResponse_Dataset_Id(UUID datasetId);
}
