package com.simulacionem.encuesta.application.service;

record GridMappingDefinition(String headerFragment, String outputGroup, GridMappingKind kind,
                             int outputStart, int maxMatches) {
    static GridMappingDefinition competence() {
        return new GridMappingDefinition("competencias", null, GridMappingKind.COMPETENCE, 0, Integer.MAX_VALUE);
    }

    static GridMappingDefinition valuation(String headerFragment, String group, int outputStart, int maxMatches) {
        return new GridMappingDefinition(headerFragment, group, GridMappingKind.VALUATION, outputStart, maxMatches);
    }
}

enum GridMappingKind {
    COMPETENCE,
    VALUATION
}
