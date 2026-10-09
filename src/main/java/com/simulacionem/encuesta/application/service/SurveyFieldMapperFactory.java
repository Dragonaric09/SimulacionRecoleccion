package com.simulacionem.encuesta.application.service;

import org.springframework.stereotype.Component;

import java.util.Map;

@Component
final class SurveyFieldMapperFactory {
    private final Map<SurveyType, SurveyFieldMapper> mappers;

    SurveyFieldMapperFactory(TituladosFieldMapper tituladosFieldMapper,
                             EmpleadoresFieldMapper empleadoresFieldMapper) {
        this.mappers = Map.of(
                SurveyType.TITULADOS, tituladosFieldMapper,
                SurveyType.EMPLEADORES, empleadoresFieldMapper);
    }

    SurveyFieldMapper forType(SurveyType surveyType) {
        SurveyFieldMapper mapper = mappers.get(surveyType);
        if (mapper == null) {
            throw new IllegalArgumentException("Tipo de encuesta no soportado: " + surveyType);
        }
        return mapper;
    }
}
