package com.simulacionem.encuesta.infrastructure.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "import_issue")
public class ImportIssueEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "dataset_id", nullable = false)
    private DatasetImportEntity dataset;
    @Column(name = "source_row_number")
    private Integer sourceRowNumber;
    @Column(name = "source_column_index")
    private Integer sourceColumnIndex;
    @Column(name = "source_column_name")
    private String sourceColumnName;
    @Column(name = "original_value")
    private String originalValue;
    @Column(nullable = false, length = 20)
    private String severity;
    @Column(name = "issue_code", nullable = false, length = 80)
    private String issueCode;
    @Column(nullable = false)
    private String message;

    protected ImportIssueEntity() { }

    public ImportIssueEntity(DatasetImportEntity dataset, Integer row, Integer column, String columnName,
                             String originalValue, String severity, String issueCode, String message) {
        this.dataset = dataset;
        this.sourceRowNumber = row;
        this.sourceColumnIndex = column;
        this.sourceColumnName = columnName;
        this.originalValue = originalValue;
        this.severity = severity;
        this.issueCode = issueCode;
        this.message = message;
    }

    public Integer getSourceRowNumber() { return sourceRowNumber; }
    public Integer getSourceColumnIndex() { return sourceColumnIndex; }
    public String getSourceColumnName() { return sourceColumnName; }
    public String getSeverity() { return severity; }
    public String getIssueCode() { return issueCode; }
    public String getMessage() { return message; }
}
