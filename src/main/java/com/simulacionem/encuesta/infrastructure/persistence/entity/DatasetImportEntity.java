package com.simulacionem.encuesta.infrastructure.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "dataset_import")
public class DatasetImportEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(name = "survey_type", nullable = false, length = 20)
    private String surveyType;
    @Column(name = "source_file_name", nullable = false)
    private String sourceFileName;
    @Column(name = "source_file_sha256", length = 64, unique = true)
    private String sourceFileSha256;
    private Short period;
    @Column(name = "imported_at", nullable = false)
    private OffsetDateTime importedAt;
    @Column(nullable = false, length = 30)
    private String status;
    @Column(name = "rows_read", nullable = false)
    private int rowsRead;
    @Column(name = "rows_valid", nullable = false)
    private int rowsValid;
    @Column(name = "rows_rejected", nullable = false)
    private int rowsRejected;
    @Column(name = "warnings_count", nullable = false)
    private int warningsCount;
    @Column(name = "errors_count", nullable = false)
    private int errorsCount;

    protected DatasetImportEntity() { }

    public DatasetImportEntity(String surveyType, String sourceFileName, String status) {
        this.surveyType = surveyType;
        this.sourceFileName = sourceFileName;
        this.status = status;
        this.importedAt = OffsetDateTime.now();
    }

    public UUID getId() { return id; }
    public String getSurveyType() { return surveyType; }
    public String getSourceFileName() { return sourceFileName; }
    public String getStatus() { return status; }
    public int getRowsRead() { return rowsRead; }
    public int getRowsValid() { return rowsValid; }
    public int getRowsRejected() { return rowsRejected; }
    public int getWarningsCount() { return warningsCount; }
    public int getErrorsCount() { return errorsCount; }
    public Short getPeriod() { return period; }
    public void setRowsRead(int rowsRead) { this.rowsRead = rowsRead; }
    public void setRowsValid(int rowsValid) { this.rowsValid = rowsValid; }
    public void setSourceFileSha256(String sourceFileSha256) { this.sourceFileSha256 = sourceFileSha256; }
    public void setPeriod(Short period) { this.period = period; }
    public void setStatus(String status) { this.status = status; }
    public void setRowsRejected(int rowsRejected) { this.rowsRejected = rowsRejected; }
    public void setWarningsCount(int warningsCount) { this.warningsCount = warningsCount; }
    public void setErrorsCount(int errorsCount) { this.errorsCount = errorsCount; }
}
