package com.simulacionem.encuesta.infrastructure.persistence.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "dataset_column_mapping")
public class DatasetColumnMappingEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "dataset_id", nullable = false)
    private DatasetImportEntity dataset;
    @Column(name = "source_column_index", nullable = false)
    private int sourceColumnIndex;
    @Column(name = "source_column_name", nullable = false)
    private String sourceColumnName;
    @Column(name = "internal_key", length = 150)
    private String internalKey;
    @Column(name = "question_number")
    private Integer questionNumber;
    @Column(name = "data_type", length = 30)
    private String dataType;
    @Column(name = "is_personal", nullable = false)
    private boolean personal;
    @Column(name = "mapping_status", nullable = false, length = 30)
    private String mappingStatus;

    protected DatasetColumnMappingEntity() { }

    public DatasetColumnMappingEntity(DatasetImportEntity dataset, int index, String name, String internalKey,
                                      String dataType, boolean personal, String mappingStatus) {
        this.dataset = dataset;
        this.sourceColumnIndex = index;
        this.sourceColumnName = name;
        this.internalKey = internalKey;
        this.dataType = dataType;
        this.personal = personal;
        this.mappingStatus = mappingStatus;
    }
}
