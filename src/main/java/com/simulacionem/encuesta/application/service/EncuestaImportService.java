package com.simulacionem.encuesta.application.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.simulacionem.encuesta.infrastructure.persistence.EncuestaResponseRepository;
import com.simulacionem.encuesta.infrastructure.persistence.SurveyJsonMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@Service
public class EncuestaImportService {

    private final EncuestaResponseRepository encuestaResponseRepository;
    private final SurveyJsonMapper surveyJsonMapper;
    private final ObjectMapper objectMapper;

    public EncuestaImportService(EncuestaResponseRepository encuestaResponseRepository, SurveyJsonMapper surveyJsonMapper, ObjectMapper objectMapper) {
        this.encuestaResponseRepository = encuestaResponseRepository;
        this.surveyJsonMapper = surveyJsonMapper;
        this.objectMapper = objectMapper;
    }

    public ResultadoImportacion importarTitulados(JsonNode payload) {
        return importar(payload, TipoEncuesta.TITULADOS);
    }

    public ResultadoImportacion importarEmpleadores(JsonNode payload) {
        return importar(payload, TipoEncuesta.EMPLEADORES);
    }

    private ResultadoImportacion importar(JsonNode payload, TipoEncuesta tipoEncuesta) {
        List<Map<String, Object>> registros = surveyJsonMapper.extraerRegistros(payload);
        if (registros.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El JSON no contiene registros válidos para importar");
        }

        int guardados = 0;
        for (Map<String, Object> registro : registros) {
            guardados += switch (tipoEncuesta) {
                case TITULADOS -> encuestaResponseRepository.guardarTitulado(surveyJsonMapper.mapearTitulado(asNode(registro)));
                case EMPLEADORES -> encuestaResponseRepository.guardarEmpleador(surveyJsonMapper.mapearEmpleador(asNode(registro)));
            };
        }

        return new ResultadoImportacion(tipoEncuesta.name().toLowerCase(), registros.size(), guardados);
    }

    private JsonNode asNode(Map<String, Object> registro) {
        return objectMapper.valueToTree(registro);
    }

    public record ResultadoImportacion(String tipo, int recibidos, int guardados) {
    }

    private enum TipoEncuesta {
        TITULADOS,
        EMPLEADORES
    }
}