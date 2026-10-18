package com.simulacionem.encuesta.application.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class TituladosFieldMapperTest {
    @Test
    void areaDePosgradoEsRespuestaUnica() {
        FieldMappingDefinition definition = TituladosFieldMapper.DEFINITIONS.stream()
                .filter(item -> item.key().equals("area_posgrado_interes"))
                .findFirst()
                .orElseThrow();

        assertThat(definition.kind()).isEqualTo(MappingKind.CATEGORY);
    }
}
