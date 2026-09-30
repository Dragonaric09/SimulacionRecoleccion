package com.simulacionem.analitica.domain.service;

import com.simulacionem.analitica.domain.model.ResultadoChiCuadrado;
import com.simulacionem.analitica.domain.model.TablaContingencia;

public interface PruebaIndependencia {

    ResultadoChiCuadrado evaluar(TablaContingencia tabla, double alfa);
}
