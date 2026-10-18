package com.simulacionem.analitica.presentation.rest;

import com.simulacionem.analitica.application.service.TituladosFilter;

import java.util.List;

/**
 * Filtros de titulados que llegan en la URL (por ejemplo {@code ?gender=Mujer&ageRange=23 - 26 años}).
 * Spring los liga a este registro en todos los endpoints de titulados, así cada filtro nuevo se añade en un
 * solo lugar. Los de organización solo los usan los cruces y las brechas compartidas.
 */
public record TituladosQuery(Integer yearFrom, Integer yearTo,
                             List<String> laborStatus, List<String> sector,
                             List<String> gender, List<String> ageRange, List<String> postgraduateInterest,
                             List<String> organizationType, List<String> organizationSize) {

    TituladosFilter toFilter() {
        return new TituladosFilter(yearFrom, yearTo, laborStatus, sector, gender, ageRange, postgraduateInterest,
                organizationType, organizationSize);
    }
}
