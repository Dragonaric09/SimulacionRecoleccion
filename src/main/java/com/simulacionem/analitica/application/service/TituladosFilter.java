package com.simulacionem.analitica.application.service;

import java.util.List;

public record TituladosFilter(Integer yearFrom, Integer yearTo,
                              List<String> laborStatuses, List<String> sectors) {
    public TituladosFilter {
        laborStatuses = laborStatuses == null ? List.of() : List.copyOf(laborStatuses);
        sectors = sectors == null ? List.of() : List.copyOf(sectors);
    }

    public boolean active() {
        return yearFrom != null || yearTo != null || !laborStatuses.isEmpty() || !sectors.isEmpty();
    }
}
