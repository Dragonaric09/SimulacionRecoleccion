package com.simulacionem.analitica.application.service;

import java.util.List;
import java.util.UUID;

/**
 * Filtros de la sección Empleadores. Cada lista vacía significa «sin filtro». En cada lista, la opción
 * «Sin respuesta» selecciona las organizaciones que no respondieron esa pregunta.
 *
 * @param types         tipo de organización (Público / Privado)
 * @param sizes         tamaño de la organización
 * @param sectors       rubro o sector principal
 * @param departments   departamento
 * @param hired         contrató titulados en los últimos 5 años (Sí / No)
 * @param probabilities posibilidad de incorporar ingenieros en los próximos años
 */
public record EmployerFilters(UUID datasetId, List<String> types, List<String> sizes, List<String> sectors,
                              List<String> departments, List<String> hired, List<String> probabilities) {
    public EmployerFilters {
        types = copy(types);
        sizes = copy(sizes);
        sectors = copy(sectors);
        departments = copy(departments);
        hired = copy(hired);
        probabilities = copy(probabilities);
    }

    public static EmployerFilters of(UUID datasetId, List<String> types, List<String> sizes) {
        return new EmployerFilters(datasetId, types, sizes, List.of(), List.of(), List.of(), List.of());
    }

    public EmployerFilters withDataset(UUID resolved) {
        return new EmployerFilters(resolved, types, sizes, sectors, departments, hired, probabilities);
    }

    public boolean active() {
        return !types.isEmpty() || !sizes.isEmpty() || !sectors.isEmpty() || !departments.isEmpty()
                || !hired.isEmpty() || !probabilities.isEmpty();
    }

    private static List<String> copy(List<String> values) {
        return values == null ? List.of() : values.stream().filter(v -> v != null && !v.isBlank()).toList();
    }
}
