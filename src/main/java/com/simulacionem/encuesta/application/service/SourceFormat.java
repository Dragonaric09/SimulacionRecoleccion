package com.simulacionem.encuesta.application.service;

import org.apache.commons.csv.CSVRecord;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Formato de origen del archivo y columnas que no son respuestas.
 *
 * <p>Es el único lugar donde se decide qué columnas se descartan, antes de cualquier mapeo. Microsoft Forms exporta
 * los formularios como cuestionario: junto a cada pregunta agrega «Puntos: &lt;pregunta&gt;» (puntaje, casi siempre 0)
 * y «Comentarios: &lt;pregunta&gt;» (comentario del calificador, vacío), además de «Id», «Total de puntos»,
 * «Comentarios del cuestionario» y la hora de publicación de la calificación. Si esas columnas llegaran al mapeo,
 * «Puntos: &lt;pregunta&gt;» coincide con el texto de la pregunta y su 0 reemplaza a una respuesta vacía.
 *
 * <p>Las columnas descartadas quedan como encabezado nulo en {@link #analyzableHeaders()}: el resto del proceso
 * conserva la numeración original de columnas del archivo, que es la que ve el usuario en las incidencias.
 */
final class SourceFormat {

    enum Origin {
        GOOGLE_FORMS("Google Forms"),
        MICROSOFT_FORMS("Microsoft Forms"),
        DESCONOCIDO("origen no identificado");

        final String label;

        Origin(String label) {
            this.label = label;
        }
    }

    /** Columnas de calificación de Microsoft Forms que no tienen pregunta asociada. */
    private static final Set<String> MS_FORMS_GRADING = Set.of(
            "id", "total de puntos", "comentarios del cuestionario", "hora de publicacion de la calificacion");
    /** Columnas de puntaje de un cuestionario de Google Forms. */
    private static final Set<String> GOOGLE_FORMS_GRADING = Set.of("puntuacion", "puntuacion total", "score", "total score");

    private final Origin origin;
    private final List<String> headers;
    private final boolean[] discarded;
    private final boolean[] scoreColumn;
    private final Set<Integer> unexpectedContentReported = new HashSet<>();

    private SourceFormat(Origin origin, List<String> headers, boolean[] discarded, boolean[] scoreColumn) {
        this.origin = origin;
        this.headers = headers;
        this.discarded = discarded;
        this.scoreColumn = scoreColumn;
    }

    /** @param headers encabezados ya recortados (null si la celda está vacía) */
    static SourceFormat analyze(List<String> headers) {
        Origin origin = originOf(headers);
        boolean[] discarded = new boolean[headers.size()];
        boolean[] score = new boolean[headers.size()];
        for (int i = 0; i < headers.size(); i++) {
            String header = headers.get(i);
            if (header == null) continue;
            String value = FieldMappingSupport.matchable(header);
            if (origin == Origin.MICROSOFT_FORMS) {
                boolean points = value.startsWith("puntos:");
                discarded[i] = points || value.startsWith("comentarios:") || MS_FORMS_GRADING.contains(value);
                score[i] = points || value.equals("total de puntos");
            } else if (origin == Origin.GOOGLE_FORMS) {
                discarded[i] = GOOGLE_FORMS_GRADING.contains(value);
                score[i] = discarded[i];
            }
        }
        return new SourceFormat(origin, headers, discarded, score);
    }

    /**
     * Microsoft Forms se reconoce por sus columnas de sistema («Hora de inicio» y «Hora de finalización») o por las
     * parejas «Puntos:»/«Comentarios:» de un cuestionario; Google Forms, por «Marca temporal». Las reglas de
     * descarte solo se aplican cuando el origen está identificado.
     */
    private static Origin originOf(List<String> headers) {
        Set<String> values = new HashSet<>();
        int points = 0;
        int comments = 0;
        for (String header : headers) {
            if (header == null) continue;
            String value = FieldMappingSupport.matchable(header);
            values.add(value);
            if (value.startsWith("puntos:")) points++;
            if (value.startsWith("comentarios:")) comments++;
        }
        if ((values.contains("hora de inicio") && values.contains("hora de finalizacion")) || (points > 0 && comments > 0)) {
            return Origin.MICROSOFT_FORMS;
        }
        if (values.contains("marca temporal")) return Origin.GOOGLE_FORMS;
        return Origin.DESCONOCIDO;
    }

    Origin origin() {
        return origin;
    }

    /** Encabezados con null en las columnas descartadas; misma longitud y numeración que el archivo. */
    List<String> analyzableHeaders() {
        List<String> result = new ArrayList<>(headers.size());
        for (int i = 0; i < headers.size(); i++) result.add(discarded[i] ? null : headers.get(i));
        return Collections.unmodifiableList(result);
    }

    boolean isDiscarded(int column) {
        return column >= 0 && column < discarded.length && discarded[column];
    }

    int discardedCount() {
        int count = 0;
        for (boolean value : discarded) if (value) count++;
        return count;
    }

    /** Resumen de lo descartado para informar al usuario, o null si no se descartó nada. */
    String discardSummary() {
        int points = 0;
        int comments = 0;
        List<String> others = new ArrayList<>();
        for (int i = 0; i < headers.size(); i++) {
            if (!discarded[i]) continue;
            String value = FieldMappingSupport.matchable(headers.get(i));
            if (value.startsWith("puntos:")) points++;
            else if (value.startsWith("comentarios:")) comments++;
            else others.add("«" + headers.get(i) + "»");
        }
        if (points + comments + others.size() == 0) return null;
        List<String> parts = new ArrayList<>();
        if (points > 0) parts.add(points + " «Puntos: …»");
        if (comments > 0) parts.add(comments + " «Comentarios: …»");
        parts.addAll(others);
        return "Archivo exportado de " + origin.label + ": se descartaron " + discardedCount()
                + " columnas de calificación que no son respuestas (" + String.join(", ", parts) + ").";
    }

    /**
     * Revisa que lo descartado sea realmente metadato de calificación: una columna de puntaje solo admite números.
     * Devuelve las columnas descartadas con contenido inesperado en esta fila, cada una una sola vez por archivo,
     * para avisar de que podría contener respuestas.
     */
    List<Integer> unexpectedContent(CSVRecord record) {
        List<Integer> columns = new ArrayList<>();
        for (int i = 0; i < scoreColumn.length && i < record.size(); i++) {
            if (!scoreColumn[i] || unexpectedContentReported.contains(i)) continue;
            String value = FieldMappingSupport.clean(record.get(i));
            if (value != null && !value.matches("-?\\d+([.,]\\d+)?")) {
                unexpectedContentReported.add(i);
                columns.add(i);
            }
        }
        return columns;
    }
}
