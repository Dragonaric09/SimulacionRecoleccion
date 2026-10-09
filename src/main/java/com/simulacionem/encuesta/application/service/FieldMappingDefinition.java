package com.simulacionem.encuesta.application.service;

record FieldMappingDefinition(String key, String headerFragment, MappingKind kind) { }

enum MappingKind {
    TEXT,
    CATEGORY,
    LIKERT,
    MULTI_CATEGORY,
    BOOLEAN,
    NUMBER,
    LABOR_STATUS
}
