package com.simulacionem.encuesta.infrastructure.persistence.repository;

import com.simulacionem.encuesta.infrastructure.persistence.entity.DatasetImportEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface DatasetImportRepository extends JpaRepository<DatasetImportEntity, UUID> {
    /** Un archivo idéntico no se importa dos veces. */
    boolean existsBySourceFileSha256(String sourceFileSha256);
}
