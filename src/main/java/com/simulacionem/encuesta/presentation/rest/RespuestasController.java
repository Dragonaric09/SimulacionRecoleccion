package com.simulacionem.encuesta.presentation.rest;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

@RestController
public class RespuestasController {

    private final String urlAppsScript;

    public RespuestasController(@Value("${apps-script.url:}") String urlAppsScript) {
        this.urlAppsScript = urlAppsScript;
    }

    @GetMapping(value = "/api/respuestas", produces = "application/json")
    public String respuestas() {
        if (urlAppsScript.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Configura APPS_SCRIPT_URL");
        }
        return new RestTemplate().getForObject(urlAppsScript, String.class);
    }
}
