package com.simulacionem.encuesta.infrastructure.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "survey_response")
public class SurveyResponseEntity {
    @Id
    private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "dataset_id", nullable = false)
    private DatasetImportEntity dataset;
    @Column(name = "survey_type", nullable = false, length = 20)
    private String surveyType;
    @Column(name = "source_row_number", nullable = false)
    private int sourceRowNumber;
    @Column(name = "submitted_at")
    private OffsetDateTime submittedAt;
    @Column(name = "response_status", nullable = false, length = 20)
    private String responseStatus;
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "raw_payload", nullable = false, columnDefinition = "jsonb")
    private Map<String, Object> rawPayload = Map.of();
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "normalized_payload", nullable = false, columnDefinition = "jsonb")
    private Map<String, Object> normalizedPayload = Map.of();

    protected SurveyResponseEntity() { }

    public SurveyResponseEntity(DatasetImportEntity dataset, String surveyType, int sourceRowNumber,
                                String responseStatus, Map<String, Object> rawPayload) {
        this(dataset, surveyType, sourceRowNumber, null, responseStatus, rawPayload);
    }

    public SurveyResponseEntity(DatasetImportEntity dataset, String surveyType, int sourceRowNumber,
                                OffsetDateTime submittedAt, String responseStatus, Map<String, Object> rawPayload) {
        this.dataset = dataset;
        this.id = UUID.randomUUID();
        this.surveyType = surveyType;
        this.sourceRowNumber = sourceRowNumber;
        this.submittedAt = submittedAt;
        this.responseStatus = responseStatus;
        this.rawPayload = rawPayload;
        this.normalizedPayload = rawPayload;
    }

    public UUID getId() { return id; }
    public DatasetImportEntity getDataset() { return dataset; }
    public int getSourceRowNumber() { return sourceRowNumber; }
    public String getResponseStatus() { return responseStatus; }
    public String getSurveyType() { return surveyType; }
    public OffsetDateTime getSubmittedAt() { return submittedAt; }
    public Map<String, Object> getNormalizedPayload() { return normalizedPayload; }
}
