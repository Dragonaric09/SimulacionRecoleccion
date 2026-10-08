package com.simulacionem.encuesta.application.service;

import com.simulacionem.encuesta.application.dto.ImportIssueDto;
import com.simulacionem.encuesta.application.dto.ImportReportDto;
import com.simulacionem.encuesta.infrastructure.persistence.entity.DatasetImportEntity;
import com.simulacionem.encuesta.infrastructure.persistence.entity.DatasetColumnMappingEntity;
import com.simulacionem.encuesta.infrastructure.persistence.entity.EmployerResponseEntity;
import com.simulacionem.encuesta.infrastructure.persistence.entity.CompetenceRatingEntity;
import com.simulacionem.encuesta.infrastructure.persistence.entity.ImportIssueEntity;
import com.simulacionem.encuesta.infrastructure.persistence.entity.SurveyResponseEntity;
import com.simulacionem.encuesta.infrastructure.persistence.entity.TitledResponseEntity;
import com.simulacionem.encuesta.infrastructure.persistence.repository.DatasetImportRepository;
import com.simulacionem.encuesta.infrastructure.persistence.repository.DatasetColumnMappingRepository;
import com.simulacionem.encuesta.infrastructure.persistence.repository.EmployerResponseRepository;
import com.simulacionem.encuesta.infrastructure.persistence.repository.CompetenceCatalogRepository;
import com.simulacionem.encuesta.infrastructure.persistence.repository.CompetenceRatingRepository;
import com.simulacionem.encuesta.infrastructure.persistence.repository.ImportIssueRepository;
import com.simulacionem.encuesta.infrastructure.persistence.repository.SurveyResponseRepository;
import com.simulacionem.encuesta.infrastructure.persistence.repository.TitledResponseRepository;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class CsvImportService {
    private static final DateTimeFormatter TIMESTAMP = DateTimeFormatter.ofPattern("d/M/uuuu H:mm:ss");
    private final DatasetImportRepository datasetImports;
    private final SurveyResponseRepository responses;
    private final ImportIssueRepository issues;
    private final DatasetColumnMappingRepository mappings;
    private final TitledResponseRepository titledResponses;
    private final EmployerResponseRepository employerResponses;
    private final CompetenceCatalogRepository competenceCatalog;
    private final CompetenceRatingRepository competenceRatings;

    public CsvImportService(DatasetImportRepository datasetImports,
                            SurveyResponseRepository responses,
                            ImportIssueRepository issues,
                            DatasetColumnMappingRepository mappings,
                            TitledResponseRepository titledResponses,
                            EmployerResponseRepository employerResponses,
                            CompetenceCatalogRepository competenceCatalog,
                            CompetenceRatingRepository competenceRatings) {
        this.datasetImports = datasetImports;
        this.responses = responses;
        this.issues = issues;
        this.mappings = mappings;
        this.titledResponses = titledResponses;
        this.employerResponses = employerResponses;
        this.competenceCatalog = competenceCatalog;
        this.competenceRatings = competenceRatings;
    }

    public ImportReportDto validate(MultipartFile file) throws IOException {
        ParsedCsv parsed = parse(file);
        return report(null, parsed);
    }

    @Transactional
    public ImportReportDto importFile(MultipartFile file) throws IOException {
        ParsedCsv parsed = parse(file);
        String status = parsed.errors() > 0 ? "CON_ERRORES" : (parsed.warnings() > 0 ? "CON_ADVERTENCIAS" : "LISTO");
        DatasetImportEntity dataset = new DatasetImportEntity(parsed.surveyType(), safeName(file.getOriginalFilename()), status);
        dataset.setSourceFileSha256(sha256(file.getBytes()));
        dataset.setRowsRead(parsed.rowsRead());
        dataset.setRowsValid(parsed.validRows());
        dataset.setRowsRejected(parsed.rejectedRows());
        dataset.setWarningsCount(parsed.warnings());
        dataset.setErrorsCount(parsed.errors());
        dataset.setPeriod(parsed.period());
        dataset = datasetImports.saveAndFlush(dataset);

        for (int i = 0; i < parsed.headers().size(); i++) {
            String header = parsed.headers().get(i);
            boolean personal = personal(header == null ? "" : header.toLowerCase(Locale.ROOT));
            String internalKey = internalKey(header);
            mappings.save(new DatasetColumnMappingEntity(dataset, i + 1, header,
                    internalKey, dataType(internalKey), personal,
                    personal ? "EXCLUDED" : (internalKey == null ? "UNMAPPED" : "MAPPED")));
        }

        if (parsed.errors() == 0) {
            for (RowResult row : parsed.rows()) {
                if (row.valid()) {
                    SurveyResponseEntity response = responses.saveAndFlush(new SurveyResponseEntity(dataset, parsed.surveyType(), row.rowNumber(), "VALIDA", row.values()));
                    if (response.getId() == null) {
                        response = responses.findByDataset_IdAndSourceRowNumber(dataset.getId(), row.rowNumber()).orElseThrow();
                    }
                    persistSpecificResponse(parsed.surveyType(), response);
                    persistCompetences(response, row.values());
                }
            }
        }
        for (Issue issue : parsed.issues()) {
            issues.save(new ImportIssueEntity(dataset, issue.row(), issue.column(), issue.columnName(),
                    issue.originalValue(), issue.severity(), issue.code(), issue.message()));
        }
        return report(dataset.getId(), parsed, status);
    }

    private ParsedCsv parse(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            return ParsedCsv.error("ARCHIVO_VACIO", "El archivo CSV está vacío");
        }
        String fileName = safeName(file.getOriginalFilename()).toLowerCase(Locale.ROOT);
        if (!fileName.endsWith(".csv")) {
            return ParsedCsv.error("EXTENSION_INVALIDA", "El archivo debe tener extensión .csv");
        }
        byte[] bytes = file.getBytes();
        if (bytes.length >= 3 && bytes[0] == (byte) 0xEF && bytes[1] == (byte) 0xBB && bytes[2] == (byte) 0xBF) {
            bytes = java.util.Arrays.copyOfRange(bytes, 3, bytes.length);
        }
        try { StandardCharsets.UTF_8.newDecoder().decode(java.nio.ByteBuffer.wrap(bytes)); }
        catch (java.nio.charset.CharacterCodingException ex) {
            return ParsedCsv.error("CODIFICACION_INVALIDA", "El archivo debe estar codificado en UTF-8");
        }
        try (CSVParser parser = CSVFormat.DEFAULT.builder()
                .setHeader()
                .setSkipHeaderRecord(true)
                .setIgnoreEmptyLines(true)
                .setAllowMissingColumnNames(true)
                .build()
                .parse(new InputStreamReader(new java.io.ByteArrayInputStream(bytes), StandardCharsets.UTF_8))) {
            List<String> headers = parser.getHeaderNames();
            List<Issue> parsedIssues = new ArrayList<>();
            if (headers.isEmpty() || headers.stream().allMatch(h -> clean(h) == null)) {
                return ParsedCsv.error("ENCABEZADO_AUSENTE", "El CSV no contiene encabezados válidos");
            }
            if (headers.size() < 10) {
                return ParsedCsv.error("COLUMNAS_INSUFICIENTES", "El CSV no contiene el mínimo de columnas esperado");
            }
            String type = detectType(headers);
            if (type == null) {
                parsedIssues.add(new Issue(null, null, null, null, "ERROR", "TIPO_NO_RECONOCIDO", "No se pudo identificar si el CSV corresponde a titulados o empleadores"));
            }
            List<String> normalizedHeaders = headers.stream().map(this::clean).toList();
            Map<String, Integer> headerOccurrences = new LinkedHashMap<>();
            for (int i = 0; i < normalizedHeaders.size(); i++) {
                if (normalizedHeaders.get(i) == null) {
                    parsedIssues.add(new Issue(null, i + 1, headers.get(i), null, "ERROR", "COLUMNA_SIN_NOMBRE", "Existe una columna sin nombre"));
                } else {
                    String normalized = normalizedHeaders.get(i).toLowerCase(Locale.ROOT);
                    int occurrence = headerOccurrences.merge(normalized, 1, Integer::sum);
                    if (occurrence > 1) {
                        parsedIssues.add(new Issue(null, i + 1, headers.get(i), null, "ADVERTENCIA", "ENCABEZADO_DUPLICADO", "El encabezado aparece más de una vez; se conserva por posición de origen"));
                    }
                }
            }
            List<RowResult> rows = new ArrayList<>();
            Short period = null;
            for (CSVRecord record : parser) {
                List<Issue> rowIssues = new ArrayList<>();
                if (record.size() != headers.size()) {
                    rowIssues.add(new Issue((int) record.getRecordNumber() + 1, null, null, null, "ERROR", "FILA_DESALINEADA", "La fila no tiene la misma cantidad de columnas que el encabezado"));
                }
                Map<String, Object> values = normalizedValues(headers, record, rowIssues);
                String timestamp = firstValue(headers, record, "marca temporal");
                if (timestamp != null) {
                    try {
                        period = period == null ? (short) LocalDateTime.parse(timestamp, TIMESTAMP).getYear() : period;
                    } catch (DateTimeParseException ex) {
                        rowIssues.add(new Issue((int) record.getRecordNumber() + 1, indexOf(headers, "marca temporal") + 1, "Marca temporal", timestamp, "ADVERTENCIA", "FECHA_NO_RECONOCIDA", "La fecha no se pudo convertir; se conserva el valor original"));
                    }
                }
                rows.add(new RowResult((int) record.getRecordNumber() + 1, values, rowIssues));
                parsedIssues.addAll(rowIssues);
            }
            int errors = (int) parsedIssues.stream().filter(i -> i.severity().equals("ERROR")).count();
            int warnings = (int) parsedIssues.stream().filter(i -> i.severity().equals("ADVERTENCIA")).count();
            int valid = (int) rows.stream().filter(RowResult::valid).count();
            return new ParsedCsv(type == null ? "TITULADOS" : type, headers, rows, parsedIssues, period,
                    rows.size(), valid, rows.size() - valid, warnings, errors);
        }
    }

    private Map<String, Object> normalizedValues(List<String> headers, CSVRecord record, List<Issue> rowIssues) {
        Map<String, Object> values = new LinkedHashMap<>();
        for (int i = 0; i < headers.size(); i++) {
            String header = clean(headers.get(i));
            String value = i < record.size() ? clean(record.get(i)) : null;
            if (header == null || value == null || personal(header)) continue;
            values.put("column_" + (i + 1), value);
        }
        putKnown(values, headers, record, "edad_rango", "edad que tiene actualmente");
        putKnown(values, headers, record, "anio_titulacion", "año de titulación");
        putKnown(values, headers, record, "sector_trabajo", "sector en el que trabaja");
        putKnown(values, headers, record, "tipo_organizacion", "tipo de organización");
        putKnown(values, headers, record, "tamano_organizacion", "tamaño de la organización");
        putKnown(values, headers, record, "rubro_organizacion", "rubro o sector principal");
        putKnown(values, headers, record, "situacion_laboral_actual", "situación laboral actual");
        normalizeBoolean(values, headers, record, "tiene_formacion_complementaria", "ha realizado o se encuentra realizando");
        normalizeBoolean(values, headers, record, "interes_posgrado", "estaría interesado en realizar estudios");
        normalizeBoolean(values, headers, record, "contrato_titulados_ultimos_5_anios", "ha contratado ingenieros");
        normalizeBoolean(values, headers, record, "primera_experiencia_laboral", "primer empleo");
        normalizeNumber(values, headers, record, "anio_titulacion", "año de titulación", rowIssues);
        normalizeNumber(values, headers, record, "anios_vida_profesional", "años de vida profesional", rowIssues);
        normalizeNumber(values, headers, record, "anios_desempleo", "cantidad corresponde al total de tiempo", rowIssues);
        for (int i = 0; i < headers.size(); i++) {
            String header = clean(headers.get(i));
            if (header == null || !header.toLowerCase(Locale.ROOT).contains("competencias")) continue;
            String marker = header.indexOf('[') >= 0 && header.indexOf(']') > header.indexOf('[')
                    ? header.substring(header.indexOf('[') + 1, header.indexOf(']')) : null;
            if (marker != null && i < record.size()) {
                String value = clean(record.get(i));
                if (value != null) values.put("competence:" + competenceCode(marker), value);
            }
        }
        for (int i = 0; i < headers.size(); i++) {
            String header = clean(headers.get(i));
            if (i < 14 || i > 31 || header == null || !header.contains("[") || header.toLowerCase(Locale.ROOT).contains("competencias")) continue;
            int valuationIndex = i - 13;
            String value = i < record.size() ? clean(record.get(i)) : null;
            if (value == null) continue;
            String group = valuationIndex <= 10 ? "formacion" : "relacion";
            values.put("valoracion_" + group + "_" + (valuationIndex <= 10 ? valuationIndex : valuationIndex - 10), value);
        }
        return values;
    }

    private void persistSpecificResponse(String surveyType, SurveyResponseEntity response) {
        Map<String, Object> payload = response.getNormalizedPayload();
        if ("TITULADOS".equals(surveyType)) {
            Short year = numberAsShort(payload.get("anio_titulacion"));
            titledResponses.save(new TitledResponseEntity(response, year));
        } else if ("EMPLEADORES".equals(surveyType)) {
            employerResponses.save(new EmployerResponseEntity(response, stringValue(payload.get("tipo_organizacion"))));
        }
    }

    private void persistCompetences(SurveyResponseEntity response, Map<String, Object> values) {
        values.entrySet().stream().filter(entry -> entry.getKey().startsWith("competence:")).forEach(entry -> {
            String code = entry.getKey().substring("competence:".length());
            competenceCatalog.findByCode(code).ifPresent(catalog -> {
                String original = String.valueOf(entry.getValue());
                boolean notObserved = original.toLowerCase(Locale.ROOT).contains("no observado");
                Short numeric = notObserved ? null : ratingValue(original);
                if (notObserved || numeric != null) competenceRatings.save(new CompetenceRatingEntity(response, catalog, numeric, notObserved, original));
            });
        });
    }

    private String internalKey(String header) {
        if (header == null || clean(header) == null || personal(header.toLowerCase(Locale.ROOT))) return null;
        String lower = header.toLowerCase(Locale.ROOT);
        if (lower.contains("marca temporal")) return "submitted_at";
        if (lower.contains("edad que tiene")) return "edad_rango";
        if (lower.contains("año de titulación") || lower.contains("ano de titulacion")) return "anio_titulacion";
        if (lower.contains("tipo de organización") || lower.contains("tipo de organizacion")) return "tipo_organizacion";
        if (lower.contains("tamaño de la organización") || lower.contains("tamano de la organizacion")) return "tamano_organizacion";
        return null;
    }

    private String dataType(String key) { return key == null ? null : (key.equals("submitted_at") ? "date_time" : key.contains("anio") ? "integer" : "category"); }
    private String slug(String value) { return value.toLowerCase(Locale.ROOT).replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u").replaceAll("[^a-z0-9]+", "_").replaceAll("^_|_$", ""); }
    private String competenceCode(String value) {
        String slug = slug(value);
        return switch (slug) {
            case "programacion_y_desarrollo_de_software" -> "programacion_software";
            case "ingenieria_de_requisitos_y_modelado_de_sistemas" -> "ingenieria_requisitos";
            default -> slug;
        };
    }
    private String stringValue(Object value) { return value == null ? null : String.valueOf(value); }
    private Short numberAsShort(Object value) { try { return value == null ? null : (short) Double.parseDouble(String.valueOf(value)); } catch (NumberFormatException ex) { return null; } }
    private Short ratingValue(String value) { try { return (short) Integer.parseInt(value.trim().replaceFirst("[^0-9]*([1-5]).*", "$1")); } catch (NumberFormatException ex) { return null; } }

    private void putKnown(Map<String, Object> values, List<String> headers, CSVRecord record, String key, String fragment) {
        String value = firstValue(headers, record, fragment);
        if (value != null) values.put(key, value);
    }

    private void normalizeBoolean(Map<String, Object> values, List<String> headers, CSVRecord record, String key, String fragment) {
        String value = firstValue(headers, record, fragment);
        if (value == null) return;
        String normalized = clean(value).toLowerCase(Locale.ROOT);
        if (normalized.equals("si") || normalized.equals("sí")) values.put(key, true);
        else if (normalized.equals("no")) values.put(key, false);
        else values.put(key, value);
    }

    private void normalizeNumber(Map<String, Object> values, List<String> headers, CSVRecord record, String key, String fragment, List<Issue> rowIssues) {
        String value = firstValue(headers, record, fragment);
        if (value == null) return;
        try {
            String numeric = value.replace(',', '.').replaceFirst("[^0-9.+-].*$", "");
            values.put(key, Double.parseDouble(numeric));
        } catch (NumberFormatException ex) {
            rowIssues.add(new Issue((int) record.getRecordNumber() + 1, indexOf(headers, fragment) + 1, fragment, value, "ADVERTENCIA", "NUMERO_NO_RECONOCIDO", "El valor numérico no se pudo convertir y se conserva como texto"));
        }
    }

    private String detectType(List<String> headers) {
        String all = headers.stream().map(this::clean).filter(java.util.Objects::nonNull)
                .map(value -> value.toLowerCase(Locale.ROOT)).reduce("", (a, b) -> a + " " + b);
        if (all.contains("tipo de organización") || all.contains("tipo de organizacion")) return "EMPLEADORES";
        if (all.contains("edad que tiene actualmente") || all.contains("año de titulación") || all.contains("ano de titulacion")) return "TITULADOS";
        return null;
    }

    private String firstValue(List<String> headers, CSVRecord record, String fragment) {
        int index = indexOf(headers, fragment);
        return index >= 0 && index < record.size() ? clean(record.get(index)) : null;
    }

    private int indexOf(List<String> headers, String fragment) {
        String wanted = clean(fragment);
        for (int i = 0; i < headers.size(); i++) {
            String header = clean(headers.get(i));
            if (header != null && header.toLowerCase(Locale.ROOT).contains(wanted.toLowerCase(Locale.ROOT))) return i;
        }
        return -1;
    }

    private boolean personal(String header) {
        header = header.toLowerCase(Locale.ROOT);
        return header.contains("correo") || header.contains("email") || header.contains("nombre") || header.contains("apellido")
                || header.contains("empresa") || header.contains("nit") || header.contains("razon social") || header.contains("direccion")
                || header.contains("telefono") || header.contains("whatsapp") || header.contains("linkedin") || header.contains("representante")
                || header.contains("pagina web") || header.contains("redes sociales");
    }

    private String clean(String value) {
        if (value == null) return null;
        String result = value.trim();
        return result.isEmpty() ? null : result;
    }

    private String safeName(String name) { return name == null || name.isBlank() ? "archivo.csv" : name; }

    private String sha256(byte[] data) throws IOException {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(data);
            return java.util.HexFormat.of().formatHex(digest);
        } catch (java.security.NoSuchAlgorithmException ex) {
            throw new IOException("No se pudo calcular la huella del archivo", ex);
        }
    }

    private ImportReportDto report(java.util.UUID id, ParsedCsv parsed) { return report(id, parsed, parsed.errors() > 0 ? "CON_ERRORES" : (parsed.warnings() > 0 ? "CON_ADVERTENCIAS" : "LISTO")); }
    private ImportReportDto report(java.util.UUID id, ParsedCsv parsed, String status) {
        return new ImportReportDto(id, parsed.surveyType(), status, parsed.rowsRead(), parsed.validRows(), parsed.rejectedRows(), parsed.warnings(), parsed.errors(),
                parsed.issues().stream().map(i -> new ImportIssueDto(i.row(), i.column(), i.columnName(), i.severity(), i.code(), i.message())).toList());
    }

    private record Issue(Integer row, Integer column, String columnName, String originalValue, String severity, String code, String message) { }
    private record RowResult(int rowNumber, Map<String, Object> values, List<Issue> issues) { boolean valid() { return issues.stream().noneMatch(i -> i.severity().equals("ERROR")); } }
    private record ParsedCsv(String surveyType, List<String> headers, List<RowResult> rows, List<Issue> issues, Short period, int rowsRead, int validRows, int rejectedRows, int warnings, int errors) {
        static ParsedCsv error(String code, String message) { return new ParsedCsv("DESCONOCIDO", List.of(), List.of(), List.of(new Issue(null, null, null, null, "ERROR", code, message)), null, 0, 0, 0, 0, 1); }
    }
}
