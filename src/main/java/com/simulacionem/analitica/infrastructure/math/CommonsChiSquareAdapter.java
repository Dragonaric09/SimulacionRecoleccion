package com.simulacionem.analitica.infrastructure.math;

import com.simulacionem.analitica.domain.model.ResultadoChiCuadrado;
import com.simulacionem.analitica.domain.model.TablaContingencia;
import com.simulacionem.analitica.domain.service.PruebaIndependencia;
import org.apache.commons.math3.stat.inference.ChiSquareTest;
import org.springframework.stereotype.Component;

@Component
public class CommonsChiSquareAdapter implements PruebaIndependencia {

    private final ChiSquareTest chiSquareTest = new ChiSquareTest();

    @Override
    public ResultadoChiCuadrado evaluar(TablaContingencia tabla, double alfa) {
        long[][] observados = tabla.frecuencias();
        double estadistico = chiSquareTest.chiSquare(observados);
        double pValor = chiSquareTest.chiSquareTest(observados);
        return new ResultadoChiCuadrado(estadistico, tabla.gradosLibertad(), pValor, alfa, pValor < alfa);
    }
}
