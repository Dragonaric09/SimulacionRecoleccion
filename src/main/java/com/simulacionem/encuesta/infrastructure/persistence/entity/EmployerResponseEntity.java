package com.simulacionem.encuesta.infrastructure.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

import java.util.UUID;

@Entity
@Table(name = "employer_response")
public class EmployerResponseEntity {
    @Id
    @Column(name = "response_id")
    private UUID responseId;
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "response_id", insertable = false, updatable = false)
    private SurveyResponseEntity response;
    @Column(name = "organization_type", length = 100)
    private String organizationType;
    @Column(name = "organization_size", length = 100)
    private String organizationSize;
    @Column(name = "organization_sector", length = 180)
    private String organizationSector;

    protected EmployerResponseEntity() { }

    public EmployerResponseEntity(SurveyResponseEntity response, String organizationType) {
        this.response = response;
        this.responseId = response.getId();
        this.organizationType = organizationType;
    }
}
