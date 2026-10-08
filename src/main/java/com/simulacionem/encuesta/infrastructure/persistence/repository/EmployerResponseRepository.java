package com.simulacionem.encuesta.infrastructure.persistence.repository;

import com.simulacionem.encuesta.infrastructure.persistence.entity.EmployerResponseEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface EmployerResponseRepository extends JpaRepository<EmployerResponseEntity, UUID> { }
