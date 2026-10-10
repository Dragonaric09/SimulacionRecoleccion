package com.simulacionem.encuesta.application.service;

import com.simulacionem.encuesta.infrastructure.persistence.AnalisisResultadosRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

@Service
public class RespuestaCacheService {

    private static final String TIPO_CACHE = "cache_api_respuestas";

    private final AnalisisResultadosRepository analisisResultadosRepository;
    private final RestTemplate restTemplate;
    private final String urlEmpleadores;
    private final String urlEmpleados;

    public RespuestaCacheService(
            AnalisisResultadosRepository analisisResultadosRepository,
            @Value("${apps-script.empleadores-url:}") String urlEmpleadores,
            @Value("${apps-script.empleados-url:}") String urlEmpleados) {
        this.analisisResultadosRepository = analisisResultadosRepository;
        this.restTemplate = new RestTemplate();
        this.urlEmpleadores = urlEmpleadores;
        this.urlEmpleados = urlEmpleados;
    }

    public String obtenerEmpleadores() {
        return obtenerRespuesta("/api/empleadores", urlEmpleadores);
    }

    public String obtenerEmpleados() {
        return obtenerRespuesta("/api/empleados", urlEmpleados);
    }

    private String obtenerRespuesta(String claveCache, String url) {
        if (url == null || url.isBlank()) {
            return analisisResultadosRepository.findLatestResult(TIPO_CACHE, claveCache)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Configura las URLs de Apps Script o carga una respuesta cacheada en PostgreSQL"));
        }

        try {
            String respuestaRemota = restTemplate.getForObject(url, String.class);
            if (respuestaRemota != null && !respuestaRemota.isBlank()) {
                analisisResultadosRepository.saveResult(TIPO_CACHE, claveCache, "apps-script", respuestaRemota);
                return respuestaRemota;
            }
        } catch (Exception ex) {
            String cache = analisisResultadosRepository.findLatestResult(TIPO_CACHE, claveCache).orElse(null);
            if (cache != null) {
                return cache;
            }
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "No se pudo consultar Apps Script ni recuperar una respuesta cacheada", ex);
        }

        return analisisResultadosRepository.findLatestResult(TIPO_CACHE, claveCache)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "La respuesta remota está vacía y no existe cache local"));
    }
}