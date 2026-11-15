package com.simulacionem.analitica.application.dto;

import java.util.List;
import java.util.UUID;

/**
 * Tabulación exploratoria: dos variables categóricas (X filas, Y columnas) y el resumen de una variable numérica Z
 * dentro de cada combinación. Es descriptiva: no tiene hipótesis, grados de libertad ni valor p.
 *
 * <p>Los números van sin redondear; el redondeo es de la presentación. Una medida no calculable es {@code null}
 * (por ejemplo, la desviación estándar con un solo valor), nunca cero.
 */
public record ExploratoryDto(
        UUID datasetId,
        String status,
        Config config,
        Bases bases,
        List<String> rowCategories,
        List<String> columnCategories,
        List<Cell> cells,
        Summary global,
        List<String> warnings) {

    /** Estado del resultado: datos calculados, alguna pregunta no está en el archivo o el filtro dejó la base vacía. */
    public static final String OK = "OK";
    public static final String PREGUNTA_AUSENTE = "PREGUNTA_AUSENTE";
    public static final String BASE_VACIA = "BASE_VACIA";

    public record Config(String type, String rowField, String rowLabel, String columnField, String columnLabel,
                         String valueField, String valueLabel, String unit) { }

    /**
     * @param totalResponses    respuestas válidas del dataset
     * @param filteredResponses las que quedan tras los filtros
     * @param nXY               personas clasificadas en una combinación de X e Y
     * @param nZ                de ellas, las que además tienen un valor válido de Z
     * @param exclusions        motivos por los que una persona no entra en la tabla o no aporta Z (cada una una sola vez)
     */
    public record Bases(long totalResponses, long filteredResponses, long nXY, long nZ, List<Exclusion> exclusions) { }

    public record Exclusion(String reason, long count) { }

    /**
     * Resumen de Z en un grupo.
     *
     * @param n        personas del grupo
     * @param m        personas con Z válida (0 ≤ m ≤ n)
     * @param coverage 100·m/n, o null si n = 0
     * @param state    SIN_OBSERVACIONES, SIN_MEDIDA, UNA_MEDIDA o COMPLETO
     */
    public record Summary(long n, long m, Double coverage, Double mean, Double median, Double standardDeviation,
                          Double min, Double max, String state) { }

    public record Cell(String row, String column, Summary summary) { }
}
