package com.simulacionem.shared.infrastructure.web;

import org.springframework.beans.propertyeditors.CustomCollectionEditor;
import org.springframework.beans.propertyeditors.StringArrayPropertyEditor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.WebDataBinder;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.InitBinder;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

/**
 * Reglas comunes a toda la API. Los manejadores propios de cada controlador siguen teniendo prioridad.
 */
@RestControllerAdvice(annotations = RestController.class)
public class ApiRequestAdvice {

    /**
     * Por defecto Spring parte por comas un parámetro de lista que llega una sola vez, así que
     * {@code ?hiringProbability=Sí, existe una alta probabilidad…} se convertía en dos valores que no coinciden
     * con ninguna respuesta. Cada valor del filtro se conserva entero; varios valores se envían repitiendo el
     * parámetro.
     */
    @InitBinder
    void keepCommasInsideFilterValues(WebDataBinder binder) {
        binder.registerCustomEditor(List.class, new CustomCollectionEditor(List.class));
        binder.registerCustomEditor(String[].class, new StringArrayPropertyEditor(null));
    }

    /** Recurso inexistente o eliminado: 404 con un mensaje legible, nunca 500 (H-06). */
    @ExceptionHandler(NoSuchElementException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    Map<String, String> notFound(NoSuchElementException ex) {
        String message = ex.getMessage();
        return Map.of("error", message == null || message.equals("No value present")
                ? "El recurso solicitado no existe o fue eliminado" : message);
    }

    /** Entrada inválida: 400 con el motivo, sin traza de la excepción. */
    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    Map<String, String> invalid(IllegalArgumentException ex) {
        return Map.of("error", ex.getMessage() == null ? "Solicitud inválida" : ex.getMessage());
    }
}
