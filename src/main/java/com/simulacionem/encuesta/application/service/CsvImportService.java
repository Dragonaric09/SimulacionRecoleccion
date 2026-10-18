package com.simulacionem.encuesta.application.service;

import com.simulacionem.encuesta.application.dto.ImportIssueDto;
import com.simulacionem.encuesta.application.dto.ImportReportDto;
import com.simulacionem.encuesta.infrastructure.persistence.entity.CompetenceCatalogEntity;
import com.simulacionem.encuesta.infrastructure.persistence.entity.DatasetColumnMappingEntity;
import com.simulacionem.encuesta.infrastructure.persistence.entity.DatasetImportEntity;
import com.simulacionem.encuesta.infrastructure.persistence.jdbc.SurveyResponseBatchWriter;
import com.simulacionem.encuesta.infrastructure.persistence.jdbc.SurveyResponseBatchWriter.CompetenceValue;
import com.simulacionem.encuesta.infrastructure.persistence.jdbc.SurveyResponseBatchWriter.EmployerFields;
import com.simulacionem.encuesta.infrastructure.persistence.jdbc.SurveyResponseBatchWriter.IssueRow;
import com.simulacionem.encuesta.infrastructure.persistence.jdbc.SurveyResponseBatchWriter.ResponseRow;
import com.simulacionem.encuesta.infrastructure.persistence.jdbc.SurveyResponseBatchWriter.TitledFields;
import com.simulacionem.encuesta.infrastructure.persistence.repository.CompetenceCatalogRepository;
import com.simulacionem.encuesta.infrastructure.persistence.repository.DatasetColumnMappingRepository;
import com.simulacionem.encuesta.infrastructure.persistence.repository.DatasetImportRepository;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Importación de encuestas en un solo recorrido del CSV.
 *
 * Las filas se normalizan, se validan y se escriben por lotes ({@link #BATCH_SIZE}); nunca se
 * mantienen todas en memoria. Un archivo ya importado se rechaza por su huella SHA-256.
 * Cada fila se decide por sí misma: una fila con error no impide guardar el resto del archivo.
 */
@Service
public class CsvImportService {
    /** Filas por lote de escritura. */
    static final int BATCH_SIZE = 1_000;
    /** Incidencias que se guardan en import_issue. El contador sigue contando las que no se guardan. */
    static final int MAX_STORED_ISSUES = 50_000;
    /** Incidencias que se devuelven en la respuesta HTTP. */
    static final int MAX_REPORTED_ISSUES = 300;

    private static final DateTimeFormatter TIMESTAMP = DateTimeFormatter.ofPattern("d/M/uuuu H:mm:ss");
    private static final ZoneId SOURCE_ZONE = ZoneId.of("America/La_Paz");
    /** Origen de los números de serie de fecha de Excel (sistema de 1900 con el error del año bisiesto corregido). */
    private static final LocalDateTime EXCEL_EPOCH = LocalDateTime.of(1899, 12, 30, 0, 0);
    private static final byte[] UTF8_BOM = {(byte) 0xEF, (byte) 0xBB, (byte) 0xBF};

    private final DatasetImportRepository datasetImports;
    private final DatasetColumnMappingRepository mappings;
    private final CompetenceCatalogRepository competenceCatalog;
    private final SurveyFieldMapperFactory fieldMapperFactory;
    private final SurveyTypeDetector surveyTypeDetector;
    private final SurveyResponseBatchWriter writer;

    public CsvImportService(DatasetImportRepository datasetImports,
                            DatasetColumnMappingRepository mappings,
                            CompetenceCatalogRepository competenceCatalog,
                            SurveyFieldMapperFactory fieldMapperFactory,
                            SurveyTypeDetector surveyTypeDetector,
                            SurveyResponseBatchWriter writer) {
        this.datasetImports = datasetImports;
        this.mappings = mappings;
        this.competenceCatalog = competenceCatalog;
        this.fieldMapperFactory = fieldMapperFactory;
        this.surveyTypeDetector = surveyTypeDetector;
        this.writer = writer;
    }

    /** Valida el archivo sin guardar nada. */
    public ImportReportDto validate(MultipartFile file) throws IOException {
        return process(file, false);
    }

    /** Valida e importa el archivo como dataset nuevo. */
    @Transactional
    public ImportReportDto importFile(MultipartFile file) throws IOException {
        return process(file, true);
    }

    private ImportReportDto process(MultipartFile file, boolean persist) throws IOException {
        if (file == null || file.isEmpty()) {
            return failure("ARCHIVO_VACIO", "El archivo CSV está vacío");
        }
        String fileName = safeName(file.getOriginalFilename());
        if (!fileName.toLowerCase(Locale.ROOT).endsWith(".csv")) {
            return failure("EXTENSION_INVALIDA", "El archivo debe tener extensión .csv");
        }
        byte[] bytes = withoutBom(file.getBytes());
        if (!isUtf8(bytes)) {
            return failure("CODIFICACION_INVALIDA", "El archivo debe estar codificado en UTF-8");
        }
        String sha256 = sha256(bytes);
        if (datasetImports.existsBySourceFileSha256(sha256)) {
            return failure("ARCHIVO_YA_IMPORTADO", "Este archivo ya fue importado como dataset");
        }

        try (CSVParser parser = csvParser(bytes)) {
            List<String> rawHeaders = parser.getHeaderNames();
            if (rawHeaders.isEmpty() || rawHeaders.stream().allMatch(h -> clean(h) == null)) {
                return failure("ENCABEZADO_AUSENTE", "El CSV no contiene encabezados válidos");
            }
            if (rawHeaders.size() < 10) {
                return failure("COLUMNAS_INSUFICIENTES", "El CSV no contiene el mínimo de columnas esperado");
            }
            SurveyType detected = surveyTypeDetector.detect(rawHeaders);
            if (detected == null) {
                return failure("TIPO_NO_RECONOCIDO", "No se pudo identificar si el CSV corresponde a titulados o empleadores");
            }
            String type = detected.name();
            List<String> headers = rawHeaders.stream().map(this::clean).toList();

            Tally tally = new Tally();
            addHeaderIssues(headers, tally);
            int timestampColumn = indexOf(headers, "marca temporal");
            boolean[] personalColumns = personalColumns(headers);

            DatasetImportEntity dataset = null;
            Map<String, Long> competenceIds = Map.of();
            if (persist) {
                dataset = datasetImports.saveAndFlush(new DatasetImportEntity(type, fileName, "VALIDANDO"));
                dataset.setSourceFileSha256(sha256);
                saveColumnMappings(dataset, headers, type);
                competenceIds = competenceIds();
            }

            List<ResponseRow> batch = new ArrayList<>(persist ? BATCH_SIZE : 0);
            for (CSVRecord record : parser) {
                RowResult row = readRow(type, headers, timestampColumn, personalColumns, record, rawHeaders.size());
                tally.addRow(row);
                tally.addAll(row.issues());
                if (persist) {
                    batch.add(toResponseRow(type, row, competenceIds));
                    if (batch.size() >= BATCH_SIZE) {
                        writer.writeResponses(dataset.getId(), type, batch);
                        batch = new ArrayList<>(BATCH_SIZE);
                    }
                }
            }

            String status = tally.errors > 0 ? "CON_ERRORES" : (tally.warnings > 0 ? "CON_ADVERTENCIAS" : "LISTO");
            if (persist) {
                writer.writeResponses(dataset.getId(), type, batch);
                writer.writeIssues(dataset.getId(), tally.stored.stream()
                        .map(issue -> new IssueRow(issue.row(), issue.column(), issue.columnName(), issue.originalValue(),
                                issue.severity(), issue.code(), issue.message()))
                        .toList());
                dataset.setStatus(status);
                dataset.setRowsRead(tally.rowsRead);
                dataset.setRowsValid(tally.rowsValid);
                dataset.setRowsRejected(tally.rowsRejected);
                dataset.setWarningsCount(tally.warnings);
                dataset.setErrorsCount(tally.errors);
                dataset.setPeriod(tally.period);
                datasetImports.save(dataset);
            }
            return report(dataset == null ? null : dataset.getId(), type, status, tally);
        }
    }

    private RowResult readRow(String type, List<String> headers, int timestampColumn, boolean[] personalColumns,
                              CSVRecord record, int expectedColumns) {
        int rowNumber = (int) record.getRecordNumber() + 1;
        List<Issue> rowIssues = new ArrayList<>();
        if (record.size() != expectedColumns) {
            rowIssues.add(new Issue(rowNumber, null, null, null, "ERROR", "FILA_DESALINEADA",
                    "La fila no tiene la misma cantidad de columnas que el encabezado"));
        }
        Map<String, Object> raw = rawValues(headers, personalColumns, record);
        Map<String, Object> values = normalizedValues(type, headers, record, rowIssues);

        OffsetDateTime submittedAt = null;
        String timestamp = timestampColumn >= 0 && timestampColumn < record.size() ? clean(record.get(timestampColumn)) : null;
        if (timestamp != null) {
            try {
                LocalDateTime parsed = timestampOf(timestamp);
                submittedAt = parsed.atZone(SOURCE_ZONE).toOffsetDateTime();
                values.put("submitted_at", submittedAt.toString());
            } catch (DateTimeParseException ex) {
                rowIssues.add(new Issue(rowNumber, timestampColumn + 1, "Marca temporal", timestamp, "ADVERTENCIA",
                        "FECHA_NO_RECONOCIDA", "La fecha no se pudo convertir; se conserva el valor original"));
            }
        }
        return new RowResult(rowNumber, raw, values, submittedAt, rowIssues);
    }

    private void addHeaderIssues(List<String> headers, Tally tally) {
        Map<String, Integer> occurrences = new LinkedHashMap<>();
        Set<String> warned = new HashSet<>();
        for (int i = 0; i < headers.size(); i++) {
            String header = headers.get(i);
            if (header == null) {
                tally.add(new Issue(null, i + 1, null, null, "ERROR", "COLUMNA_SIN_NOMBRE", "Existe una columna sin nombre"));
                continue;
            }
            String normalized = header.toLowerCase(Locale.ROOT);
            if (occurrences.merge(normalized, 1, Integer::sum) > 1 && warned.add(normalized)) {
                tally.add(new Issue(null, i + 1, header, null, "ADVERTENCIA", "ENCABEZADO_DUPLICADO",
                        "El encabezado aparece más de una vez; por fila se conserva el primer valor no vacío"));
            }
        }
    }

    private void saveColumnMappings(DatasetImportEntity dataset, List<String> headers, String type) {
        for (int i = 0; i < headers.size(); i++) {
            String header = headers.get(i) == null ? "(sin nombre)" : headers.get(i);
            boolean personal = personal(header.toLowerCase(Locale.ROOT));
            String internalKey = internalKey(type, header);
            mappings.save(new DatasetColumnMappingEntity(dataset, i + 1, header,
                    internalKey, dataType(internalKey), personal,
                    personal ? "EXCLUDED" : (internalKey == null ? "UNMAPPED" : "MAPPED")));
        }
    }

    private Map<String, Long> competenceIds() {
        Map<String, Long> ids = new LinkedHashMap<>();
        for (CompetenceCatalogEntity competence : competenceCatalog.findAll()) {
            ids.put(competence.getCode(), competence.getId());
        }
        return ids;
    }

    private ResponseRow toResponseRow(String type, RowResult row, Map<String, Long> competenceIds) {
        boolean valid = row.valid();
        Map<String, Object> values = row.values();
        List<CompetenceValue> competences = valid ? competenceValues(values, competenceIds) : List.of();
        Short graduationYear = "TITULADOS".equals(type) ? numberAsShort(values.get("anio_titulacion")) : null;
        TitledFields titled = valid && "TITULADOS".equals(type) ? titledFields(values, graduationYear) : null;
        EmployerFields employer = valid && "EMPLEADORES".equals(type) ? employerFields(values, competences) : null;
        return new ResponseRow(UUID.randomUUID(), row.rowNumber(), row.submittedAt(), valid ? "VALIDA" : "RECHAZADA",
                row.raw(), values, graduationYear, titled, employer, competences);
    }

    private TitledFields titledFields(Map<String, Object> values, Short graduationYear) {
        return new TitledFields(
                stringValue(values.get("edad_rango")), stringValue(values.get("genero")), graduationYear,
                stringValue(values.get("sector_trabajo")), booleanValue(values.get("tiene_formacion_complementaria")),
                booleanValue(values.get("interes_posgrado")), decimalValue(values.get("anios_vida_profesional")),
                decimalValue(values.get("anios_desempleo")), stringValue(values.get("situacion_laboral_actual")),
                stringValue(values.get("sector_trabajo_actual")), stringValue(values.get("departamento_trabajo")),
                booleanValue(values.get("es_primer_empleo") != null ? values.get("es_primer_empleo") : values.get("primera_experiencia_laboral")),
                stringValue(values.get("tiempo_primer_empleo")), integerValue(values.get("cantidad_empleos")));
    }

    private List<CompetenceValue> competenceValues(Map<String, Object> values, Map<String, Long> competenceIds) {
        List<CompetenceValue> result = new ArrayList<>();
        for (Map.Entry<String, Object> entry : values.entrySet()) {
            if (!entry.getKey().startsWith("competence:")) continue;
            Long id = competenceIds.get(entry.getKey().substring("competence:".length()));
            if (id == null) continue;
            String original = String.valueOf(entry.getValue());
            boolean notObserved = original.toLowerCase(Locale.ROOT).contains("no observado");
            Short numeric = notObserved ? null : ratingValue(original);
            if (notObserved || numeric != null) {
                result.add(new CompetenceValue(id, numeric, notObserved, original));
            }
        }
        return result;
    }

    private EmployerFields employerFields(Map<String, Object> values, List<CompetenceValue> competences) {
        List<Short> numbers = competences.stream().map(CompetenceValue::numericValue).filter(java.util.Objects::nonNull).toList();
        BigDecimal average = numbers.isEmpty() ? null : BigDecimal.valueOf(
                numbers.stream().mapToInt(Short::intValue).average().orElse(0)).setScale(2, RoundingMode.HALF_UP);
        Short[] valuations = new Short[EmpleadoresFieldMapper.VALUATIONS.size()];
        for (int i = 0; i < valuations.length; i++) {
            valuations[i] = valuationCode(stringValue(values.get(EmpleadoresFieldMapper.VALUATIONS.get(i).key())));
        }
        short fullAgreement = (short) Arrays.stream(valuations).filter(code -> code != null && code == 1).count();
        Object hired = values.get("contrato_titulados_ultimos_5_anios");
        return new EmployerFields(
                stringValue(values.get("tipo_organizacion")),
                stringValue(values.get("tamano_organizacion")),
                stringValue(values.get("rubro_organizacion")),
                hired instanceof Boolean flag ? flag : null,
                stringValue(values.get("posibilidad_incorporacion")),
                stringValue(values.get("nivel_formacion_demandado")),
                stringValue(values.get("departamento_organizacion")),
                stringValue(values.get("presencia_sedes")),
                average,
                fullAgreement,
                valuations,
                stringValue(values.get("medio_convocatoria")),
                stringValue(values.get("cargos_titulados")),
                foundedYear(values.get("anio_inicio_operaciones")),
                topPositionRank(stringValue(values.get("cargos_titulados"))));
    }

    /** Año de inicio de operaciones si es un año plausible (entre 1800 y el año actual); si no, null. */
    private static Short foundedYear(Object value) {
        if (value == null) return null;
        try {
            int year = (int) Math.round(Double.parseDouble(String.valueOf(value)));
            return year >= 1800 && year <= java.time.Year.now().getValue() ? (short) year : null;
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    /** Jerarquía de los cargos de la pregunta de casillas (en el orden del formulario); consultoría queda fuera. */
    private static final List<String> POSITION_HIERARCHY = List.of(
            "de apoyo / asistencia tecnologica", "tecnico (", "analista (", "especialista (",
            "supervisor / coordinador", "jefatura o gerencial");

    /** Cargo de mayor nivel marcado (1 Apoyo … 6 Jefatura o gerencia), o null si solo marcó consultoría u otro. */
    private static Short topPositionRank(String positions) {
        if (positions == null) return null;
        String normalized = FieldMappingSupport.matchable(positions);
        for (int rank = POSITION_HIERARCHY.size(); rank >= 1; rank--) {
            if (normalized.contains(POSITION_HIERARCHY.get(rank - 1))) return (short) rank;
        }
        return null;
    }

    /** 1 = Totalmente de acuerdo, 2 = Parcialmente de acuerdo, 3 = Totalmente desacuerdo, 4 = No sabe; null si no es una de ellas. */
    private static Short valuationCode(String answer) {
        if (answer == null) return null;
        String normalized = FieldMappingSupport.matchable(answer);
        if (normalized.equals("totalmente de acuerdo")) return (short) 1;
        if (normalized.equals("parcialmente de acuerdo")) return (short) 2;
        if (normalized.equals("totalmente desacuerdo")) return (short) 3;
        if (normalized.equals("no sabe")) return (short) 4;
        return null;
    }

    private ImportReportDto report(UUID datasetId, String type, String status, Tally tally) {
        List<ImportIssueDto> reported = tally.stored.stream().limit(MAX_REPORTED_ISSUES)
                .map(i -> new ImportIssueDto(i.row(), i.column(), i.columnName(), i.severity(), i.code(), i.message()))
                .toList();
        return new ImportReportDto(datasetId, type, status, tally.rowsRead, tally.rowsValid, tally.rowsRejected,
                tally.warnings, tally.errors, reported);
    }

    private ImportReportDto failure(String code, String message) {
        return new ImportReportDto(null, "DESCONOCIDO", "CON_ERRORES", 0, 0, 0, 0, 1,
                List.of(new ImportIssueDto(null, null, null, "ERROR", code, message)));
    }

    /** Contadores y incidencias del archivo. Las incidencias se guardan hasta {@link #MAX_STORED_ISSUES}. */
    private static final class Tally {
        final List<Issue> stored = new ArrayList<>();
        int rowsRead;
        int rowsValid;
        int rowsRejected;
        int errors;
        int warnings;
        Short period;

        void addRow(RowResult row) {
            rowsRead++;
            if (row.valid()) rowsValid++;
            else rowsRejected++;
            if (period == null && row.submittedAt() != null) period = (short) row.submittedAt().getYear();
        }

        void addAll(List<Issue> issues) {
            issues.forEach(this::add);
        }

        void add(Issue issue) {
            if ("ERROR".equals(issue.severity())) errors++;
            else warnings++;
            if (stored.size() < MAX_STORED_ISSUES) stored.add(issue);
        }
    }

    private record RowResult(int rowNumber, Map<String, Object> raw, Map<String, Object> values,
                             OffsetDateTime submittedAt, List<Issue> issues) {
        boolean valid() {
            return issues.stream().noneMatch(issue -> issue.severity().equals("ERROR"));
        }
    }

    private record Issue(Integer row, Integer column, String columnName, String originalValue, String severity,
                         String code, String message) { }

    private CSVParser csvParser(byte[] bytes) throws IOException {
        return CSVFormat.DEFAULT.builder()
                .setHeader()
                .setSkipHeaderRecord(true)
                .setIgnoreEmptyLines(true)
                .setAllowMissingColumnNames(true)
                .build()
                .parse(new InputStreamReader(new ByteArrayInputStream(bytes), StandardCharsets.UTF_8));
    }

    private static byte[] withoutBom(byte[] bytes) {
        if (bytes.length >= 3 && Arrays.equals(Arrays.copyOf(bytes, 3), UTF8_BOM)) {
            return Arrays.copyOfRange(bytes, 3, bytes.length);
        }
        return bytes;
    }

    private static boolean isUtf8(byte[] bytes) {
        try {
            StandardCharsets.UTF_8.newDecoder().decode(ByteBuffer.wrap(bytes));
            return true;
        } catch (CharacterCodingException ex) {
            return false;
        }
    }

    private Map<String, Object> normalizedValues(String surveyType, List<String> headers, CSVRecord record, List<Issue> rowIssues) {
        SurveyFieldMapper mapper = fieldMapperFactory.forType(SurveyType.valueOf(surveyType));
        List<FieldMappingSupport.MappingIssue> mappingIssues = new ArrayList<>();
        Map<String, Object> values = mapper.map(headers, record, mappingIssues);
        mappingIssues.forEach(issue -> rowIssues.add(toIssue(issue)));
        addDerivedValues(values, headers, record, mapper.gridDefinitions());
        mapper.validate(values, (int) record.getRecordNumber() + 1).forEach(issue -> rowIssues.add(toIssue(issue)));
        return values;
    }

    /** Celdas originales de las columnas no personales, tal como llegaron del CSV. */
    private Map<String, Object> rawValues(List<String> headers, boolean[] personalColumns, CSVRecord record) {
        Map<String, Object> raw = new LinkedHashMap<>();
        for (int i = 0; i < headers.size() && i < record.size(); i++) {
            String header = headers.get(i);
            String value = clean(record.get(i));
            if (header == null || value == null || personalColumns[i]) continue;
            raw.put("column_" + (i + 1), value);
        }
        return raw;
    }

    private boolean[] personalColumns(List<String> headers) {
        boolean[] personal = new boolean[headers.size()];
        for (int i = 0; i < headers.size(); i++) {
            personal[i] = headers.get(i) != null && personal(headers.get(i).toLowerCase(Locale.ROOT));
        }
        return personal;
    }

    private Issue toIssue(FieldMappingSupport.MappingIssue issue) {
        return new Issue(issue.row(), issue.column(), issue.columnName(), issue.originalValue(),
                issue.severity(), issue.code(), issue.message());
    }

    /**
     * Marca temporal del formulario: texto «d/M/aaaa H:mm:ss» (CSV de Google Forms o de Excel) o número de
     * serie de Excel (celda de fecha leída sin formato). Cualquier otro valor lanza DateTimeParseException.
     */
    private LocalDateTime timestampOf(String raw) {
        if (raw.matches("\\d+(\\.\\d+)?")) {
            return EXCEL_EPOCH.plusSeconds(Math.round(Double.parseDouble(raw) * 86_400));
        }
        return LocalDateTime.parse(raw, TIMESTAMP);
    }

    private void addDerivedValues(Map<String, Object> values, List<String> headers, CSVRecord record,
                                  List<GridMappingDefinition> definitions) {
        if (definitions.isEmpty()) return;
        GridMappingSupport.applyMappings(values, headers, record, definitions, this::competenceCode);
    }

    private String internalKey(String surveyType, String header) {
        if (header == null || clean(header) == null) return null;
        if ("EMPLEADORES".equals(surveyType)) {
            return personal(header.toLowerCase(Locale.ROOT)) ? null
                    : fieldMapperFactory.forType(SurveyType.EMPLEADORES).columnKey(header);
        }
        String lower = clean(header).toLowerCase(Locale.ROOT).replaceAll("\\s+", " ").trim();
        String gridKey = gridInternalKey(header);
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

    /** Claves de titulados en cuadrícula. Las de empleadores las resuelve su mapeador. */
    private String gridInternalKey(String header) {
        String lower = FieldMappingSupport.matchable(header);
        boolean competenceGrid = lower.contains("competencias tecnicas") || lower.contains("competencias transversales");
        if (competenceGrid && header.contains("[") && header.contains("]")) {
            int start = header.indexOf('[');
            int end = header.indexOf(']', start + 1);
            if (end > start) return "competence:" + competenceCode(header.substring(start + 1, end));
        }
        if (lower.contains("opinion personal respecto al posgrado")) return "valoracion_formacion_1";
        if (lower.contains("evalua su formacion")) return "valoracion_formacion_2";
        if (lower.contains("de manera global")) return "valoracion_formacion_3";
        if (lower.contains("existe concordancia entre")) return "valoracion_formacion_5";
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
        if (Set.of("area_trabajo", "aspectos_utiles", "aspectos_mejorables",
                "asignaturas_ventaja", "asignaturas_poco_utiles", "cargos_titulados",
                "redes_sociales_activas").contains(key)) return "multi_category";
        if (key.equals("rubro_empresa") || key.endsWith("_rango") || key.contains("nivel_")
                || key.contains("modalidad") || key.contains("sector_") || key.contains("situacion_")) return "category";
        return "text";
    }

    private String slug(String value) {
        return value.toLowerCase(Locale.ROOT).replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u")
                .replaceAll("[^a-z0-9]+", "_").replaceAll("^_|_$", "");
    }

    private String competenceCode(String value) {
        return switch (slug(value)) {
            case "programacion_y_desarrollo_de_software" -> "programacion_software";
            case "bases_de_datos" -> "bases_datos";
            case "redes_e_infraestructura" -> "redes_infraestructura";
            case "analisis_de_datos" -> "analisis_datos";
            case "ingenieria_de_requisitos_y_modelado_de_sistemas" -> "ingenieria_requisitos";
            case "gestion_de_proyectos" -> "gestion_proyectos";
            case "comunicacion_oral_y_escrita" -> "comunicacion";
            case "trabajo_en_equipo" -> "trabajo_equipo";
            case "resolucion_de_problemas" -> "resolucion_problemas";
            default -> slug(value);
        };
    }

    private String stringValue(Object value) { return value == null ? null : String.valueOf(value); }

    private Short numberAsShort(Object value) {
        try {
            return value == null ? null : (short) Double.parseDouble(String.valueOf(value));
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private Boolean booleanValue(Object value) {
        if (value == null) return null;
        String normalized = slug(String.valueOf(value));
        if (normalized.equals("si") || normalized.equals("true") || normalized.equals("1")) return true;
        if (normalized.equals("no") || normalized.equals("false") || normalized.equals("0")) return false;
        return null;
    }

    private BigDecimal decimalValue(Object value) {
        try {
            return value == null ? null : new BigDecimal(String.valueOf(value).replace(',', '.'));
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private Integer integerValue(Object value) {
        try {
            return value == null ? null : (int) Double.parseDouble(String.valueOf(value).replace(',', '.'));
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private Short ratingValue(String value) {
        try {
            return (short) Integer.parseInt(value.trim().replaceFirst("[^0-9]*([1-5]).*", "$1"));
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private int indexOf(List<String> headers, String fragment) {
        String wanted = FieldMappingSupport.matchable(fragment);
        for (int i = 0; i < headers.size(); i++) {
            if (headers.get(i) != null && FieldMappingSupport.matchable(headers.get(i)).contains(wanted)) return i;
        }
        return -1;
    }

    private boolean personal(String header) {
        return FieldMappingSupport.isPersonal(header);
    }

    private String clean(String value) {
        if (value == null) return null;
        String result = value.trim();
        return result.isEmpty() ? null : result;
    }

    private String safeName(String name) { return name == null || name.isBlank() ? "archivo.csv" : name; }

    private static String sha256(byte[] data) throws IOException {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(data));
        } catch (NoSuchAlgorithmException ex) {
            throw new IOException("No se pudo calcular la huella del archivo", ex);
        }
    }
}
