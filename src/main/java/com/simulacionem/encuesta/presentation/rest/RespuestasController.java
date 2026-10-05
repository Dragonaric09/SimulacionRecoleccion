package com.simulacionem.encuesta.presentation.rest;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
public class RespuestasController {

    private final String urlAppsScriptEmpleadores;
    private final String urlAppsScriptEmpleados;

    public RespuestasController(
            @Value("${apps-script.empleadores-url:}") String urlAppsScriptEmpleadores,
            @Value("${apps-script.empleados-url:}") String urlAppsScriptEmpleados) {
        this.urlAppsScriptEmpleadores = urlAppsScriptEmpleadores;
        this.urlAppsScriptEmpleados = urlAppsScriptEmpleados;
    }

    @GetMapping(value = "/empleadores", produces = "application/json")
    public String respuestasEmpleadores() {
        return obtenerRespuestas(urlAppsScriptEmpleadores, "APPS_SCRIPT_URL_EMPLEADORES");
    }

    @GetMapping(value = "/empleados", produces = "application/json")
    public String respuestasEmpleados() {
        return obtenerRespuestas(urlAppsScriptEmpleados, "APPS_SCRIPT_URL_EMPLEADOS");
    }

    private String obtenerRespuestas(String url, String variable) {
        if (url.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Configura " + variable);
        }
        return new RestTemplate().getForObject(url, String.class);
    }
}
