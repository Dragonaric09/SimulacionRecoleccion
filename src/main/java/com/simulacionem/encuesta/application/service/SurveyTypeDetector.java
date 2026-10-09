package com.simulacionem.encuesta.application.service;

import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

@Component
final class SurveyTypeDetector {
    SurveyType detect(List<String> headers) {
        List<String> normalizedHeaders = headers.stream()
                .map(this::matchable)
                .filter(value -> !value.isBlank())
                .toList();

        if (normalizedHeaders.stream().anyMatch(header ->
                header.contains("tipo de organizacion") || header.contains("nit de la empresa"))) {
            return SurveyType.EMPLEADORES;
        }
        if (normalizedHeaders.stream().anyMatch(header ->
                header.contains("edad que tiene actualmente")
                        || header.contains("ano de titulacion")
                        || header.contains("situacion laboral actual"))) {
            return SurveyType.TITULADOS;
        }
        return null;
    }

    private String matchable(String value) {
        return Normalizer.normalize(Objects.toString(value, ""), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT);
    }
}
