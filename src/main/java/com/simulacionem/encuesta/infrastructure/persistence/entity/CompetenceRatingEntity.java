package com.simulacionem.encuesta.infrastructure.persistence.entity;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "competence_rating")
public class CompetenceRatingEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "response_id", nullable = false)
    private SurveyResponseEntity response;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "competence_id", nullable = false)
    private CompetenceCatalogEntity competence;
    @Column(name = "numeric_value")
    private Short numericValue;
    @Column(name = "not_observed", nullable = false)
    private boolean notObserved;
    @Column(name = "original_label", length = 100)
    private String originalLabel;

    protected CompetenceRatingEntity() { }
    public CompetenceRatingEntity(SurveyResponseEntity response, CompetenceCatalogEntity competence,
                                  Short numericValue, boolean notObserved, String originalLabel) {
        this.response = response;
        this.competence = competence;
        this.numericValue = numericValue;
        this.notObserved = notObserved;
        this.originalLabel = originalLabel;
    }
}
