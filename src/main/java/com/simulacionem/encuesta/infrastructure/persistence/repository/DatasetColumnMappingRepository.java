package com.simulacionem.encuesta.infrastructure.persistence.repository;

import com.simulacionem.encuesta.infrastructure.persistence.entity.DatasetColumnMappingEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface DatasetColumnMappingRepository extends JpaRepository<DatasetColumnMappingEntity, Long> {
    long countByDataset_Id(UUID datasetId);
}
