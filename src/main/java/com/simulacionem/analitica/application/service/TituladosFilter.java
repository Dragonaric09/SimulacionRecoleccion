package com.simulacionem.analitica.application.service;

import java.util.List;

/**
 * Filtros globales de analítica. Los de titulados (año, situación laboral, sector) y los de
 * empleadores (tipo y tamaño de organización) conviven: cada conjunto solo afecta al dominio que le corresponde.
 */
public record TituladosFilter(Integer yearFrom, Integer yearTo,
                              List<String> laborStatuses, List<String> sectors,
                              List<String> organizationTypes, List<String> organizationSizes) {
    public TituladosFilter {
        laborStatuses = laborStatuses == null ? List.of() : List.copyOf(laborStatuses);
        sectors = sectors == null ? List.of() : List.copyOf(sectors);
        organizationTypes = organizationTypes == null ? List.of() : List.copyOf(organizationTypes);
        organizationSizes = organizationSizes == null ? List.of() : List.copyOf(organizationSizes);
    }

    public TituladosFilter(Integer yearFrom, Integer yearTo, List<String> laborStatuses, List<String> sectors) {
        this(yearFrom, yearTo, laborStatuses, sectors, List.of(), List.of());
    }

    public static TituladosFilter none() {
        return new TituladosFilter(null, null, List.of(), List.of(), List.of(), List.of());
    }

    public static TituladosFilter organization(List<String> types, List<String> sizes) {
        return new TituladosFilter(null, null, List.of(), List.of(), types, sizes);
    }

    public boolean active() {
        return yearFrom != null || yearTo != null || !laborStatuses.isEmpty() || !sectors.isEmpty()
                || !organizationTypes.isEmpty() || !organizationSizes.isEmpty();
    }
}
