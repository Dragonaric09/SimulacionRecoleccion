package com.simulacionem.analitica.application.usecase;

import com.simulacionem.analitica.domain.model.ResultadoChiCuadrado;
import com.simulacionem.analitica.domain.model.TablaContingencia;
import com.simulacionem.analitica.domain.service.PruebaIndependencia;
import org.springframework.stereotype.Service;

@Service
public class EjecutarChiCuadradoUseCase {

    private final PruebaIndependencia pruebaIndependencia;

    public EjecutarChiCuadradoUseCase(PruebaIndependencia pruebaIndependencia) {
        this.pruebaIndependencia = pruebaIndependencia;
    }

    public ResultadoChiCuadrado ejecutar(long[][] frecuencias, double alfa) {
        return pruebaIndependencia.evaluar(new TablaContingencia(frecuencias), alfa);
    }
}
