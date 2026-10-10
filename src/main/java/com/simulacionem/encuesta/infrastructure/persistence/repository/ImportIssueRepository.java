package com.simulacionem.encuesta.infrastructure.persistence.repository;

import com.simulacionem.encuesta.infrastructure.persistence.entity.ImportIssueEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ImportIssueRepository extends JpaRepository<ImportIssueEntity, Long> {
    long countByDataset_Id(java.util.UUID datasetId);
    java.util.List<ImportIssueEntity> findByDataset_IdOrderByIdAsc(java.util.UUID datasetId);
}
