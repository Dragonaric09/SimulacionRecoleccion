package com.simulacionem.encuesta.infrastructure.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.UUID;

@Entity
@Table(name = "titled_response")
public class TitledResponseEntity {
    @Id
    @Column(name = "response_id")
    private UUID responseId;
    @Column(name = "age_range", length = 80)
    private String ageRange;
    @Column(name = "gender", length = 80)
    private String gender;
    @Column(name = "graduation_year")
    private Short graduationYear;

    protected TitledResponseEntity() { }

    public TitledResponseEntity(SurveyResponseEntity response, Short graduationYear) {
        this.responseId = response.getId();
        this.graduationYear = graduationYear;
    }
}
