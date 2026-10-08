package com.simulacionem.encuesta.presentation.rest;

import com.simulacionem.encuesta.application.dto.ImportIssueDto;
import com.simulacionem.encuesta.application.dto.ImportReportDto;
import com.simulacionem.encuesta.application.service.CsvImportService;
import com.simulacionem.encuesta.infrastructure.persistence.entity.DatasetImportEntity;
import com.simulacionem.encuesta.infrastructure.persistence.repository.DatasetImportRepository;
import com.simulacionem.encuesta.infrastructure.persistence.repository.ImportIssueRepository;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/datasets")
public class DatasetController {
    private final CsvImportService importer;
    private final DatasetImportRepository datasets;
    private final ImportIssueRepository issues;

    public DatasetController(CsvImportService importer, DatasetImportRepository datasets, ImportIssueRepository issues) {
        this.importer = importer;
        this.datasets = datasets;
        this.issues = issues;
    }

    @PostMapping("/validate")
    public ImportReportDto validate(@RequestPart("file") @NotNull MultipartFile file) throws IOException {
        return importer.validate(file);
    }

    @PostMapping("/import")
    @ResponseStatus(HttpStatus.CREATED)
    public ImportReportDto importFile(@RequestPart("file") @NotNull MultipartFile file) throws IOException {
        return importer.importFile(file);
    }

    @GetMapping
    public List<DatasetSummary> list() {
        return datasets.findAll().stream().map(DatasetSummary::from).toList();
    }

    @GetMapping("/{id}")
    public DatasetSummary get(@PathVariable UUID id) {
        return datasets.findById(id).map(DatasetSummary::from).orElseThrow();
    }

    @GetMapping("/{id}/quality")
    public QualitySummary quality(@PathVariable UUID id) {
        DatasetImportEntity dataset = datasets.findById(id).orElseThrow();
        return new QualitySummary(dataset.getId(), dataset.getRowsRead(), dataset.getRowsValid(), dataset.getRowsRejected(),
                dataset.getWarningsCount(), dataset.getErrorsCount(), issues.countByDataset_Id(id));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        if (!datasets.existsById(id)) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_FOUND, "Dataset no encontrado");
        }
        datasets.deleteById(id);
    }

    public record DatasetSummary(UUID id, String surveyType, String sourceFileName, Short period, String status,
                                 int rowsRead, int rowsValid, int rowsRejected, int warnings, int errors) {
        static DatasetSummary from(DatasetImportEntity d) {
            return new DatasetSummary(d.getId(), d.getSurveyType(), d.getSourceFileName(), d.getPeriod(), d.getStatus(),
                    d.getRowsRead(), d.getRowsValid(), d.getRowsRejected(), d.getWarningsCount(), d.getErrorsCount());
        }
    }

    public record QualitySummary(UUID datasetId, int rowsRead, int rowsValid, int rowsRejected,
                                 int warnings, int errors, long issueCount) { }
}
