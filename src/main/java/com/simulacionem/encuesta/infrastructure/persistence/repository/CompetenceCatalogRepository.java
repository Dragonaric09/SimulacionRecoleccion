package com.simulacionem.encuesta.infrastructure.persistence.repository;

import com.simulacionem.encuesta.infrastructure.persistence.entity.CompetenceCatalogEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface CompetenceCatalogRepository extends JpaRepository<CompetenceCatalogEntity, Long> {
    Optional<CompetenceCatalogEntity> findByCode(String code);
}
