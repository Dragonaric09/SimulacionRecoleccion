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
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.text.Normalizer;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class CsvImportService {
    private static final DateTimeFormatter TIMESTAMP = DateTimeFormatter.ofPattern("d/M/uuuu H:mm:ss");
    private static final ZoneId SOURCE_ZONE = ZoneId.of("America/La_Paz");
    private final DatasetImportRepository datasetImports;
    private final SurveyResponseRepository responses;
    private final ImportIssueRepository issues;
    private final DatasetColumnMappingRepository mappings;
    private final TitledResponseRepository titledResponses;
    private final EmployerResponseRepository employerResponses;
    private final CompetenceCatalogRepository competenceCatalog;
    private final CompetenceRatingRepository competenceRatings;
    private final SurveyFieldMapperFactory fieldMapperFactory;
    private final SurveyTypeDetector surveyTypeDetector;

    public CsvImportService(DatasetImportRepository datasetImports,
                            SurveyResponseRepository responses,
                            ImportIssueRepository issues,
                            DatasetColumnMappingRepository mappings,
                            TitledResponseRepository titledResponses,
                            EmployerResponseRepository employerResponses,
                            CompetenceCatalogRepository competenceCatalog,
                            CompetenceRatingRepository competenceRatings,
                            SurveyFieldMapperFactory fieldMapperFactory,
                            SurveyTypeDetector surveyTypeDetector) {
        this.datasetImports = datasetImports;
        this.responses = responses;
        this.issues = issues;
        this.mappings = mappings;
        this.titledResponses = titledResponses;
        this.employerResponses = employerResponses;
        this.competenceCatalog = competenceCatalog;
        this.competenceRatings = competenceRatings;
        this.fieldMapperFactory = fieldMapperFactory;
        this.surveyTypeDetector = surveyTypeDetector;
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
                    SurveyResponseEntity response = responses.saveAndFlush(new SurveyResponseEntity(
                            dataset, parsed.surveyType(), row.rowNumber(), row.submittedAt(), "VALIDA", row.values()));
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
            SurveyType detectedType = surveyTypeDetector.detect(headers);
            if (detectedType == null) {
                parsedIssues.add(new Issue(null, null, null, null, "ERROR", "TIPO_NO_RECONOCIDO", "No se pudo identificar si el CSV corresponde a titulados o empleadores"));
            }
            String type = detectedType == null ? null : detectedType.name();

            headers = headers.stream().map(this::clean).toList();
            Map<String, Integer> headerOccurrences = new LinkedHashMap<>();
            Set<String> warnedHeaders = new HashSet<>();
            for (int i = 0; i < headers.size(); i++) {
                if (headers.get(i) == null) {
                    parsedIssues.add(new Issue(null, i + 1, headers.get(i), null, "ERROR", "COLUMNA_SIN_NOMBRE", "Existe una columna sin nombre"));
                } else {
                    String normalized = headers.get(i).toLowerCase(Locale.ROOT);
                    int occurrence = headerOccurrences.merge(normalized, 1, Integer::sum);
                    if (occurrence > 1 && warnedHeaders.add(normalized)) {
                        parsedIssues.add(new Issue(null, i + 1, headers.get(i), null, "ADVERTENCIA", "ENCABEZADO_DUPLICADO", "El encabezado aparece más de una vez; por fila se conserva el primer valor no vacío"));
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
                Map<String, Object> values = normalizedValues(type, headers, record, rowIssues);
                String timestamp = firstValue(headers, record, "marca temporal");
                OffsetDateTime submittedAt = null;
                if (timestamp != null) {
                    try {
                        LocalDateTime parsedTimestamp = LocalDateTime.parse(timestamp, TIMESTAMP);
                        submittedAt = parsedTimestamp.atZone(SOURCE_ZONE).toOffsetDateTime();
                        values.put("submitted_at", submittedAt.toString());
                        period = period == null ? (short) parsedTimestamp.getYear() : period;
                    } catch (DateTimeParseException ex) {
                        rowIssues.add(new Issue((int) record.getRecordNumber() + 1, indexOf(headers, "marca temporal") + 1, "Marca temporal", timestamp, "ADVERTENCIA", "FECHA_NO_RECONOCIDA", "La fecha no se pudo convertir; se conserva el valor original"));
                    }
                }
                rows.add(new RowResult((int) record.getRecordNumber() + 1, values, submittedAt, rowIssues));
                parsedIssues.addAll(rowIssues);
            }
            int errors = (int) parsedIssues.stream().filter(i -> i.severity().equals("ERROR")).count();
            int warnings = (int) parsedIssues.stream().filter(i -> i.severity().equals("ADVERTENCIA")).count();
            int valid = (int) rows.stream().filter(RowResult::valid).count();
            return new ParsedCsv(type == null ? "TITULADOS" : type, headers, rows, parsedIssues, period,
                    rows.size(), valid, rows.size() - valid, warnings, errors);
        }
    }

    private Map<String, Object> normalizedValues(String surveyType, List<String> headers, CSVRecord record, List<Issue> rowIssues) {
        if ("TITULADOS".equals(surveyType) || "EMPLEADORES".equals(surveyType)) {
            List<FieldMappingSupport.MappingIssue> mappingIssues = new ArrayList<>();
            SurveyFieldMapper mapper = fieldMapperFactory.forType(SurveyType.valueOf(surveyType));
            Map<String, Object> values = mapper.map(headers, record, mappingIssues);
            mappingIssues.forEach(issue -> rowIssues.add(new Issue(issue.row(), issue.column(), issue.columnName(),
                    issue.originalValue(), issue.severity(), issue.code(), issue.message())));
            addDerivedValues(values, headers, record, mapper.gridDefinitions());
            return values;
        }
        if (surveyType == null) {
            return GenericCsvFieldMapper.map(headers, record);
        }
        Map<String, Object> values = new LinkedHashMap<>();
        for (int i = 0; i < headers.size(); i++) {
            String header = clean(headers.get(i));
            String value = i < record.size() ? clean(record.get(i)) : null;
            if (header == null || value == null || personal(header)) continue;
            values.put("column_" + (i + 1), value);
        }
        putKnown(values, headers, record, "edad_rango", "edad que tiene actualmente");
        putKnown(values, headers, record, "genero", "género");
        putKnown(values, headers, record, "anio_titulacion", "año de titulación");
        putKnown(values, headers, record, "vinculo_laboral", "vinculo laboral");
        putKnown(values, headers, record, "area_especializacion", "area de especialización");
        putKnown(values, headers, record, "cargo_profesional", "cargo");
        putKnown(values, headers, record, "titulo_profesional", "titulo de profesion");
        putKnown(values, headers, record, "sector_trabajo", "sector en el que trabaja");
        putKnown(values, headers, record, "antiguedad_trabajo", "antiguedad tiene en su actual trabajo");
        putKnown(values, headers, record, "rubro_trabajo_actual", "rubro de la organización");
        putKnown(values, headers, record, "rubro_otro", "otro rubro");
        putKnown(values, headers, record, "area_trabajo", "área dentro de la organización");
        putKnown(values, headers, record, "cargo_actual", "cargo que desempeña en su actual trabajo");
        putKnown(values, headers, record, "departamento_trabajo", "departamento de bolivia");
        putKnown(values, headers, record, "medio_obtencion_empleo", "a través de qué medio obtuvo el trabajo");
        putKnown(values, headers, record, "pertinencia_trabajo_formacion", "peritnentes a sus formación");
        putKnown(values, headers, record, "satisfaccion_formacion", "de manera global");
        putKnown(values, headers, record, "concordancia_formacion_requerimientos", "existe concordancia entre");
        putKnown(values, headers, record, "formacion_complementaria_nivel", "programa de formación complementaria de mayor nivel");
        putKnown(values, headers, record, "institucion_formacion_complementaria", "donde ha cursado el programa indicado");
        putKnown(values, headers, record, "nombre_programa_formacion", "indique el nombre del programa");
        putKnown(values, headers, record, "nivel_posgrado_interes", "qué nivel de posgrado le interesa");
        putKnown(values, headers, record, "area_posgrado_interes", "en cuál de las siguientes áreas le interesaría realizar el programa");
        putKnown(values, headers, record, "modalidad_posgrado", "modalidad preferida");
        putKnown(values, headers, record, "institucion_posgrado_interes", "organización educativa optaría por realizar sus estudios");
        putKnown(values, headers, record, "financiamiento_posgrado_estimado", "cómo financiaría sus estudios");
        putKnown(values, headers, record, "financiamiento_posgrado_cursado", "fuente de financiamiento para cursar el programa");
        putKnown(values, headers, record, "aspectos_utiles", "aspectos de la Carrera les resultaron de bastante utilidad");
        putKnown(values, headers, record, "aspectos_mejorables", "aspectos de la Carrera considera que pueden mejorarse");
        putKnown(values, headers, record, "asignaturas_ventaja", "asignaturas cursadas en la Carrera que considera que le brindaron una ventaja competitiva");
        putKnown(values, headers, record, "asignaturas_poco_utiles", "asignaturas cursadas en la Carrera que no le resultaron de mucha utilidad");
        putKnown(values, headers, record, "remuneracion_rango", "remuneración promedio mensual");
        putKnown(values, headers, record, "tipo_organizacion", "tipo de organización");
        putKnown(values, headers, record, "anio_inicio_operaciones", "año de inicio de operaciones");
        putKnown(values, headers, record, "departamento_organizacion", "departamento");
        putKnown(values, headers, record, "presencia_sedes", "presencia de sedes");
        putKnown(values, headers, record, "redes_sociales_activas", "redes sociales activas");
        putKnown(values, headers, record, "area_representante", "área en la que se desempeña");
        putKnown(values, headers, record, "cargo_representante", "cargo del representante");
        putKnown(values, headers, record, "tamano_organizacion", "tamaño de la organización");
        putKnown(values, headers, record, "rubro_organizacion", "rubro o sector principal");
        putKnown(values, headers, record, "posibilidad_incorporacion", "posibilidad de incorporar ingenieros");
        putKnown(values, headers, record, "nivel_formacion_demandado", "nivel de formación académica o actualización profesional");
        putKnown(values, headers, record, "medio_convocatoria", "medio convoca a profesionales");
        putKnown(values, headers, record, "cargos_titulados", "tipo de cargos desempeñan los profesionales titulados");
        putKnown(values, headers, record, "areas_conocimiento_demandadas", "nuevas áreas de conocimiento");
        putKnown(values, headers, record, "herramientas_tecnologicas_demandadas", "nuevas herramientas tecnológicas");
        putKnown(values, headers, record, "habilidades_demandadas", "habilidades, competencias y destrezas");
        putKnown(values, headers, record, "origen_emprendimiento", "origen del desarrollo de su propio emprendimiento");
        putKnown(values, headers, record, "entregable_emprendimiento", "tipo de entregable genera el negocio");
        putKnown(values, headers, record, "financiamiento_emprendimiento", "requerido financiamiento externo para su negocio");
        putKnown(values, headers, record, "razon_no_trabaja", "razón por la que actualmente no trabaja");
        normalizeLaborStatus(values, headers, record, "situación laboral actual");
        normalizeBoolean(values, headers, record, "tiene_formacion_complementaria", "ha realizado o se encuentra realizando");
        normalizeBoolean(values, headers, record, "interes_posgrado", "estaría interesado en realizar estudios");
        normalizeBoolean(values, headers, record, "contrato_titulados_ultimos_5_anios", "ha contratado ingenieros");
        normalizeBoolean(values, headers, record, "experiencia_laboral_previa", "ha tenido algún trabajo antes");
        normalizeBoolean(values, headers, record, "primera_experiencia_laboral", "primer empleo");
        normalizeNumber(values, headers, record, "anio_titulacion", "año de titulación", rowIssues);
        normalizeNumber(values, headers, record, "anio_inicio_operaciones", "año de inicio de operaciones", rowIssues);
        normalizeNumber(values, headers, record, "anios_vida_profesional", "años de vida profesional", rowIssues);
        normalizeNumber(values, headers, record, "anios_desempleo", "cantidad corresponde al total de tiempo", rowIssues);
        putKnown(values, headers, record, "cantidad_empleos", "en cuántos empleos usted se ha desempeñado");
        putKnown(values, headers, record, "tiempo_primer_empleo", "cuánto tiempo se demoró en conseguir su primer trabajo");
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

    private void addDerivedValues(Map<String, Object> values, List<String> headers, CSVRecord record,
                                  List<GridMappingDefinition> definitions) {
        GridMappingSupport.applyMappings(values, headers, record, definitions, this::competenceCode);
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
        if (header == null || clean(header) == null) return null;
        String lower = header.toLowerCase(Locale.ROOT);
        String gridKey = gridInternalKey(header, lower);
        if (gridKey != null) return gridKey;
        if (personal(lower)) return null;
        if (lower.contains("marca temporal")) return "submitted_at";
        if (lower.contains("edad que tiene")) return "edad_rango";
        if (lower.contains("género") || lower.contains("genero")) return "genero";
        if (lower.contains("año de inicio de operaciones") || lower.contains("ano de inicio de operaciones")) return "anio_inicio_operaciones";
        if (lower.equals("departamento")) return "departamento_organizacion";
        if (lower.contains("presencia de sedes")) return "presencia_sedes";
        if (lower.contains("redes sociales activas")) return "redes_sociales_activas";
        if (lower.contains("área en la que se desempeña") || lower.contains("area en la que se desempena")) return "area_representante";
        if (lower.contains("cargo del representante")) return "cargo_representante";
        if (lower.contains("vinculo laboral")) return "vinculo_laboral";
        if (lower.contains("area de especialización") || lower.contains("area de especializacion")) return "area_especializacion";
        if (lower.equals("cargo")) return "cargo_profesional";
        if (lower.contains("titulo de profesion")) return "titulo_profesional";
        if (lower.contains("año de titulación") || lower.contains("ano de titulacion")) return "anio_titulacion";
        if (lower.contains("ha realizado o se encuentra realizando")) return "tiene_formacion_complementaria";
        if (lower.contains("estaría interesado en realizar estudios") || lower.contains("estaria interesado en realizar estudios")) return "interes_posgrado";
        if (lower.contains("ha contratado ingenieros")) return "contrato_titulados_ultimos_5_anios";
        if (lower.contains("años de vida profesional") || lower.contains("anos de vida profesional")) return "anios_vida_profesional";
        if (lower.contains("situación laboral actual") || lower.contains("situacion laboral actual")) return "situacion_laboral_actual";
        if (lower.contains("razón por la que actualmente no trabaja") || lower.contains("razon por la que actualmente no trabaja")) return "razon_no_trabaja";
        if (lower.contains("ha tenido algún trabajo antes") || lower.contains("ha tenido algun trabajo antes")) return "experiencia_laboral_previa";
        if (lower.contains("primer empleo")) return "primera_experiencia_laboral";
        if (lower.contains("cantidad corresponde al total de tiempo")) return "anios_desempleo";
        if (lower.contains("qué competencia le hizo más falta") || lower.contains("que competencia le hizo mas falta")) return "competencia_faltante";
        if (lower.contains("en cuántos empleos") || lower.contains("en cuantos empleos")) return "cantidad_empleos";
        if (lower.contains("a través de qué medio") || lower.contains("a traves de que medio")) return "medio_obtencion_empleo";
        if (lower.contains("departamento de bolivia")) return "departamento_trabajo";
        if (lower.contains("programa de formación complementaria de mayor nivel") || lower.contains("programa de formacion complementaria de mayor nivel")) return "formacion_complementaria_nivel";
        if (lower.contains("en cuál de las siguientes áreas") || lower.contains("en cual de las siguientes areas")) return "area_posgrado_interes";
        if (lower.contains("nivel de posgrado le interesa")) return "nivel_posgrado_interes";
        if (lower.contains("modalidad preferida")) return "modalidad_posgrado";
        if (lower.contains("cómo financiaría sus estudios") || lower.contains("como financiaria sus estudios")) return "financiamiento_posgrado_estimado";
        if (lower.contains("fuente de financiamiento para cursar")) return "financiamiento_posgrado_cursado";
        if (lower.contains("organización educativa optaría") || lower.contains("organizacion educativa optaria")) return "institucion_posgrado_interes";
        if (lower.contains("indique el nombre del programa")) return "nombre_programa_formacion";
        if (lower.contains("donde ha cursado el programa indicado")) return "institucion_formacion_complementaria";
        if (lower.contains("área dentro de la organización") || lower.contains("area dentro de la organizacion")) return "area_trabajo";
        if (lower.contains("cargo que desempeña en su actual trabajo") || lower.contains("cargo que desempena en su actual trabajo")) return "cargo_actual";
        if (lower.contains("otro rubro")) return "rubro_otro";
        if (lower.contains("sector en el que trabaja")) return "sector_trabajo";
        if (lower.contains("rubro de la empresa")) return "rubro_empresa";
        if (lower.contains("trabajo en el que se encuentra")) return "sector_trabajo_actual";
        if (lower.contains("antiguedad tiene en su actual trabajo")) return "antiguedad_trabajo";
        if (lower.contains("peritnentes a sus formación") || lower.contains("pertinentes a su formación")) return "pertinencia_trabajo_formacion";
        if (lower.contains("de manera global")) return "satisfaccion_formacion";
        if (lower.contains("existe concordancia entre")) return "concordancia_formacion_requerimientos";
        if (lower.contains("rubro de la organización") || lower.contains("rubro de la organizacion")) return "rubro_trabajo_actual";
        if (lower.contains("tipo de organización") || lower.contains("tipo de organizacion")) return "tipo_organizacion";
        if (lower.contains("tamaño de la organización") || lower.contains("tamano de la organizacion")) return "tamano_organizacion";
        if (lower.contains("rubro o sector principal")) return "rubro_organizacion";
        if (lower.contains("aspectos de la carrera les resultaron")) return "aspectos_utiles";
        if (lower.contains("aspectos de la carrera considera")) return "aspectos_mejorables";
        if (lower.contains("asignaturas cursadas en la carrera que considera")) return "asignaturas_ventaja";
        if (lower.contains("asignaturas cursadas en la carrera que no le resultaron")) return "asignaturas_poco_utiles";
        if (lower.contains("remuneración promedio mensual") || lower.contains("remuneracion promedio mensual")) return "remuneracion_rango";
        if (lower.contains("origen del desarrollo de su propio emprendimiento")) return "origen_emprendimiento";
        if (lower.contains("tipo de entregable genera el negocio")) return "entregable_emprendimiento";
        if (lower.contains("requerido financiamiento externo para su negocio")) return "financiamiento_emprendimiento";
        if (lower.contains("posibilidad de incorporar ingenieros")) return "posibilidad_incorporacion";
        if (lower.contains("nivel de formación académica") || lower.contains("nivel de formacion academica")) return "nivel_formacion_demandado";
        if (lower.contains("medio convoca a profesionales")) return "medio_convocatoria";
        if (lower.contains("tipo de cargos desempeñan los profesionales titulados")) return "cargos_titulados";
        if (lower.contains("nuevas áreas de conocimiento") || lower.contains("nuevas areas de conocimiento")) return "areas_conocimiento_demandadas";
        if (lower.contains("nuevas herramientas tecnológicas") || lower.contains("nuevas herramientas tecnologicas")) return "herramientas_tecnologicas_demandadas";
        if (lower.contains("habilidades, competencias y destrezas")) return "habilidades_demandadas";
        if (lower.contains("qué competencia considera que más les falta") || lower.contains("que competencia considera que mas les falta")) return "competencia_faltante_titulados";
        return null;
    }

    private String gridInternalKey(String header, String lower) {
        lower = matchable(header);
        if (lower.contains("competencias") && header.contains("[") && header.contains("]")) {
            int start = header.indexOf('[');
            int end = header.indexOf(']', start + 1);
            if (end > start) return "competence:" + competenceCode(header.substring(start + 1, end));
        }
        if (lower.contains("opinion personal respecto al posgrado")) return "valoracion_formacion_1";
        if (lower.contains("evalua su formacion")) return "valoracion_formacion_2";
        if (lower.contains("de manera global")) return "valoracion_formacion_3";
        if (lower.contains("existe concordancia entre")) return "valoracion_formacion_5";
        if (lower.contains("brinda confianza")) return "valoracion_formacion_1";
        if (lower.contains("titulo profesional otorgado")) return "valoracion_formacion_2";
        if (lower.contains("consultan regularmente nuestra opinion")) return "valoracion_formacion_3";
        if (lower.contains("conozco el perfil profesional")) return "valoracion_formacion_4";
        if (lower.contains("perfil profesional declarado")) return "valoracion_formacion_5";
        if (lower.contains("formacion proporcionada")) return "valoracion_formacion_6";
        if (lower.contains("considera nuestra opinion")) return "valoracion_formacion_7";
        if (lower.contains("desempeno profesional de los titulados")) return "valoracion_formacion_8";
        if (lower.contains("valores y actitudes")) return "valoracion_formacion_9";
        if (lower.contains("procesos de recopilacion")) return "valoracion_formacion_10";
        if (lower.contains("mantiene vinculos")) return "valoracion_relacion_1";
        if (lower.contains("actividades de vinculacion con el entorno")) return "valoracion_relacion_2";
        if (lower.contains("actividades de difusion")) return "valoracion_relacion_3";
        if (lower.contains("vinculacion entre profesionales")) return "valoracion_relacion_4";
        if (lower.contains("como empleador, he sido consultado")) return "valoracion_relacion_5";
        if (lower.contains("ha consultado nuestra opinion")) return "valoracion_relacion_6";
        if (lower.contains("recurrimos a la universidad")) return "valoracion_relacion_7";
        if (lower.contains("consultado periodicamente")) return "valoracion_relacion_8";
        if (lower.contains("rendimiento actual de su negocio")) return "satisfaccion_emprendimiento";
        if (lower.contains("importante considera que fue su formacion en ingenieria de sistemas")) {
            return "importancia_formacion_emprendimiento";
        }
        return null;
    }

    private String dataType(String key) {
        if (key == null) return null;
        if (key.equals("submitted_at")) return "date_time";
        if (key.contains("anio") || key.startsWith("anios_")) return "integer";
        if (Set.of("tiene_formacion_complementaria", "interes_posgrado", "experiencia_laboral_previa",
                "primera_experiencia_laboral", "contrato_titulados_ultimos_5_anios",
                "financiamiento_emprendimiento").contains(key)) return "boolean";
        if (key.startsWith("valoracion_") || key.contains("satisfaccion")
                || key.contains("concordancia") || key.contains("pertinencia")
                || key.contains("importancia_formacion")) return "likert";
        if (Set.of("area_posgrado_interes", "area_trabajo", "aspectos_utiles", "aspectos_mejorables",
                "asignaturas_ventaja", "asignaturas_poco_utiles", "cargos_titulados",
                "redes_sociales_activas").contains(key)) return "multi_category";
        if (key.equals("rubro_empresa") || key.endsWith("_rango") || key.contains("nivel_")
                || key.contains("modalidad") || key.contains("sector_") || key.contains("situacion_")) return "category";
        return "text";
    }
    private String slug(String value) { return value.toLowerCase(Locale.ROOT).replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u").replaceAll("[^a-z0-9]+", "_").replaceAll("^_|_$", ""); }
    private String competenceCode(String value) {
        String slug = slug(value);
        return switch (slug) {
            case "programacion_y_desarrollo_de_software" -> "programacion_software";
            case "bases_de_datos" -> "bases_datos";
            case "redes_e_infraestructura" -> "redes_infraestructura";
            case "analisis_de_datos" -> "analisis_datos";
            case "ingenieria_de_requisitos_y_modelado_de_sistemas" -> "ingenieria_requisitos";
            case "gestion_de_proyectos" -> "gestion_proyectos";
            case "comunicacion_oral_y_escrita" -> "comunicacion";
            case "trabajo_en_equipo" -> "trabajo_equipo";
            case "resolucion_de_problemas" -> "resolucion_problemas";
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

    private void normalizeLaborStatus(Map<String, Object> values, List<String> headers, CSVRecord record, String fragment) {
        String value = firstValue(headers, record, fragment);
        if (value == null) return;
        String normalized = clean(value).toLowerCase(Locale.ROOT)
                .replace("á", "a").replace("é", "e").replace("í", "i")
                .replace("ó", "o").replace("ú", "u");
        if (normalized.contains("trabaj") && (normalized.contains("organizacion") || normalized.contains("empresa"))) {
            values.put("situacion_laboral_actual", "Trabaja en una organización");
        } else if (normalized.contains("emprend")) {
            values.put("situacion_laboral_actual", "Emprendimiento propio");
        } else if (normalized.contains("busqueda") || normalized.contains("desemple") || normalized.contains("no trabaja")) {
            values.put("situacion_laboral_actual", "En búsqueda laboral");
        } else {
            values.put("situacion_laboral_actual", value);
        }
    }

    private void normalizeNumber(Map<String, Object> values, List<String> headers, CSVRecord record, String key, String fragment, List<Issue> rowIssues) {
        String value = firstValue(headers, record, fragment);
        if (value == null) return;
        String normalized = clean(value).toLowerCase(Locale.ROOT)
                .replace("á", "a").replace("é", "e").replace("í", "i")
                .replace("ó", "o").replace("ú", "u");
        if (Set.of("no aplica", "no corresponde", "n/a", "na", "no sabe", "no responde", "sin respuesta", "-").contains(normalized)) {
            return;
        }
        try {
            String numeric = value.replace(',', '.').replaceFirst("[^0-9.+-].*$", "");
            values.put(key, Double.parseDouble(numeric));
        } catch (NumberFormatException ex) {
            rowIssues.add(new Issue((int) record.getRecordNumber() + 1, indexOf(headers, fragment) + 1, fragment, value, "ADVERTENCIA", "NUMERO_NO_RECONOCIDO", "La respuesta «" + value + "» no es numérica para «" + fragment + "» y se omitirá del cálculo"));
        }
    }

    private String firstValue(List<String> headers, CSVRecord record, String fragment) {
        String wanted = clean(fragment);
        for (int i = 0; i < headers.size() && i < record.size(); i++) {
            String header = clean(headers.get(i));
            if (header != null && matchable(header).contains(matchable(wanted))) {
                String value = clean(record.get(i));
                if (value != null) return value;
            }
        }
        return null;
    }

    private int indexOf(List<String> headers, String fragment) {
        String wanted = clean(fragment);
        for (int i = 0; i < headers.size(); i++) {
            String header = clean(headers.get(i));
            if (header != null && matchable(header).contains(matchable(wanted))) return i;
        }
        return -1;
    }

    private boolean personal(String header) {
        header = header.toLowerCase(Locale.ROOT);
        return header.contains("correo") || header.contains("email") || header.contains("nombre") || header.contains("apellido")
                || header.contains("nombre de la empresa") || header.contains("nombre comercial") || header.contains("nit") || header.contains("razon social") || header.contains("direccion")
                || header.contains("telefono") || header.contains("whatsapp") || header.contains("linkedin") || header.contains("representante")
                || header.contains("pagina web") || header.contains("redes sociales");
    }

    private String clean(String value) {
        if (value == null) return null;
        String result = value.trim();
        return result.isEmpty() ? null : result;
    }

    private String matchable(String value) {
        return Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT);
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
    private record RowResult(int rowNumber, Map<String, Object> values, OffsetDateTime submittedAt, List<Issue> issues) { boolean valid() { return issues.stream().noneMatch(i -> i.severity().equals("ERROR")); } }
    private record ParsedCsv(String surveyType, List<String> headers, List<RowResult> rows, List<Issue> issues, Short period, int rowsRead, int validRows, int rejectedRows, int warnings, int errors) {
        static ParsedCsv error(String code, String message) { return new ParsedCsv("DESCONOCIDO", List.of(), List.of(), List.of(new Issue(null, null, null, null, "ERROR", code, message)), null, 0, 0, 0, 0, 1); }
    }
}
