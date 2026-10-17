package com.simulacionem.analitica.presentation.rest;

import com.simulacionem.analitica.application.service.SeleccionPruebaEstadisticaService;
import com.simulacionem.analitica.application.usecase.EjecutarChiCuadradoUseCase;
import com.simulacionem.analitica.domain.model.ResultadoChiCuadrado;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/analitica")
public class AnaliticaController {

    private final EjecutarChiCuadradoUseCase chiCuadradoUseCase;
    private final SeleccionPruebaEstadisticaService seleccionPruebaEstadisticaService;

    public AnaliticaController(EjecutarChiCuadradoUseCase chiCuadradoUseCase,
                              SeleccionPruebaEstadisticaService seleccionPruebaEstadisticaService) {
        this.chiCuadradoUseCase = chiCuadradoUseCase;
        this.seleccionPruebaEstadisticaService = seleccionPruebaEstadisticaService;
    }

    public record ChiCuadradoRequest(
            @NotNull long[][] frecuencias,
            @DecimalMin("0.001") @DecimalMax("0.2") double alfa) {
    }

    @PostMapping("/chi-cuadrado")
    public ResultadoChiCuadrado chiCuadrado(@Valid @RequestBody ChiCuadradoRequest request) {
        return chiCuadradoUseCase.ejecutar(request.frecuencias(), request.alfa());
    }

    /** {@code respuestaMultiple}: alguna de las variables admite varias opciones por persona. */
    public record PruebaSeleccionRequest(
            @NotNull long[][] frecuencias,
            @DecimalMin("0.001") @DecimalMax("0.2") double alfa,
            Boolean respuestaMultiple) {
    }

    /** Elige χ², Fisher exacta o Fisher-Freeman-Halton según el tamaño de la tabla y sus frecuencias esperadas. */
    @PostMapping("/prueba-seleccion")
    public SeleccionPruebaEstadisticaService.ResultadoPrueba pruebaSeleccion(@Valid @RequestBody PruebaSeleccionRequest request) {
        return seleccionPruebaEstadisticaService.seleccionar(request.frecuencias(), request.alfa(),
                Boolean.TRUE.equals(request.respuestaMultiple()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, String> datosInvalidos(IllegalArgumentException ex) {
        return Map.of("error", ex.getMessage());
    }
}
