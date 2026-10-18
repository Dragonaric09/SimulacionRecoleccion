package com.simulacionem.analitica.application.service;

import java.util.List;

/**
 * Filtros globales de analítica. Los de titulados (año, situación laboral, sector, género, rango de edad e
 * interés en posgrado) y los de empleadores (tipo y tamaño de organización) conviven: cada conjunto solo
 * afecta al dominio que le corresponde. Una lista vacía significa «sin filtro».
 */
public record TituladosFilter(Integer yearFrom, Integer yearTo,
                              List<String> laborStatuses, List<String> sectors,
                              List<String> genders, List<String> ageRanges, List<String> postgraduateInterest,
                              List<String> organizationTypes, List<String> organizationSizes) {
    public TituladosFilter {
        laborStatuses = copy(laborStatuses);
        sectors = copy(sectors);
        genders = copy(genders);
        ageRanges = copy(ageRanges);
        postgraduateInterest = copy(postgraduateInterest);
        organizationTypes = copy(organizationTypes);
        organizationSizes = copy(organizationSizes);
    }

    public TituladosFilter(Integer yearFrom, Integer yearTo, List<String> laborStatuses, List<String> sectors) {
        this(yearFrom, yearTo, laborStatuses, sectors, List.of(), List.of(), List.of(), List.of(), List.of());
    }

    public static TituladosFilter none() {
        return new TituladosFilter(null, null, List.of(), List.of());
    }

    public static TituladosFilter organization(List<String> types, List<String> sizes) {
        return new TituladosFilter(null, null, List.of(), List.of(), List.of(), List.of(), List.of(), types, sizes);
    }

    public boolean active() {
        return yearFrom != null || yearTo != null || !laborStatuses.isEmpty() || !sectors.isEmpty()
                || !genders.isEmpty() || !ageRanges.isEmpty() || !postgraduateInterest.isEmpty()
                || !organizationTypes.isEmpty() || !organizationSizes.isEmpty();
    }

    private static List<String> copy(List<String> values) {
        return values == null ? List.of() : List.copyOf(values);
    }
}
