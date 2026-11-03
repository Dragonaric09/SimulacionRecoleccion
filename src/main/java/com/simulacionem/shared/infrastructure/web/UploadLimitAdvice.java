package com.simulacionem.shared.infrastructure.web;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.util.Map;

/**
 * Archivo más grande que el límite configurado (UPLOAD_MAX_SIZE). Va aparte de {@link ApiRequestAdvice} porque el
 * límite se comprueba antes de elegir el controlador, y un consejo restringido a {@code @RestController} no se
 * aplica cuando todavía no hay controlador.
 */
@RestControllerAdvice
public class UploadLimitAdvice {

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    @ResponseStatus(HttpStatus.PAYLOAD_TOO_LARGE)
    Map<String, String> tooLarge(MaxUploadSizeExceededException ex) {
        return Map.of("error", "El archivo supera el tamaño máximo permitido para importar. Divide el archivo o pide"
                + " al administrador que amplíe el límite (UPLOAD_MAX_SIZE).");
    }
}
