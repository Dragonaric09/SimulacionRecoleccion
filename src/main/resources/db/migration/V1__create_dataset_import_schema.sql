CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE dataset_import (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_type VARCHAR(20) NOT NULL CHECK (survey_type IN ('TITULADOS', 'EMPLEADORES')),
    source_file_name VARCHAR(255) NOT NULL,
    source_file_sha256 CHAR(64),
    period SMALLINT,
    imported_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(30) NOT NULL CHECK (status IN ('CARGADO', 'VALIDANDO', 'CON_ADVERTENCIAS', 'LISTO', 'CON_ERRORES')),
    rows_read INTEGER NOT NULL DEFAULT 0 CHECK (rows_read >= 0),
    rows_valid INTEGER NOT NULL DEFAULT 0 CHECK (rows_valid >= 0),
    rows_rejected INTEGER NOT NULL DEFAULT 0 CHECK (rows_rejected >= 0),
    warnings_count INTEGER NOT NULL DEFAULT 0 CHECK (warnings_count >= 0),
    errors_count INTEGER NOT NULL DEFAULT 0 CHECK (errors_count >= 0),
    UNIQUE (source_file_sha256)
);

CREATE INDEX idx_dataset_import_type_period
    ON dataset_import (survey_type, period);

CREATE TABLE dataset_column_mapping (
    id BIGSERIAL PRIMARY KEY,
    dataset_id UUID NOT NULL REFERENCES dataset_import(id) ON DELETE CASCADE,
    source_column_index INTEGER NOT NULL CHECK (source_column_index > 0),
    source_column_name TEXT NOT NULL,
    internal_key VARCHAR(150),
    question_number INTEGER,
    data_type VARCHAR(30),
    is_personal BOOLEAN NOT NULL DEFAULT FALSE,
    mapping_status VARCHAR(30) NOT NULL CHECK (mapping_status IN ('MAPPED', 'UNMAPPED', 'AMBIGUOUS', 'EXCLUDED')),
    UNIQUE (dataset_id, source_column_index)
);

CREATE TABLE survey_response (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id UUID NOT NULL REFERENCES dataset_import(id) ON DELETE CASCADE,
    survey_type VARCHAR(20) NOT NULL CHECK (survey_type IN ('TITULADOS', 'EMPLEADORES')),
    source_row_number INTEGER NOT NULL CHECK (source_row_number > 0),
    submitted_at TIMESTAMPTZ,
    response_status VARCHAR(20) NOT NULL CHECK (response_status IN ('VALIDA', 'CON_ADVERTENCIAS', 'RECHAZADA')),
    raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    normalized_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE (dataset_id, source_row_number)
);

CREATE INDEX idx_survey_response_dataset ON survey_response (dataset_id);
CREATE INDEX idx_survey_response_type ON survey_response (survey_type);

CREATE TABLE titled_response (
    response_id UUID PRIMARY KEY REFERENCES survey_response(id) ON DELETE CASCADE,
    age_range VARCHAR(80),
    gender VARCHAR(80),
    graduation_year SMALLINT,
    employment_sector VARCHAR(100),
    supplementary_education BOOLEAN,
    postgraduate_interest BOOLEAN,
    professional_years NUMERIC(6,2),
    unemployment_years NUMERIC(6,2),
    current_employment_status VARCHAR(150),
    current_work_sector VARCHAR(100),
    current_department VARCHAR(100),
    first_employment BOOLEAN,
    first_employment_wait VARCHAR(100),
    employment_count INTEGER
);

CREATE INDEX idx_titled_response_graduation_year ON titled_response (graduation_year);
CREATE INDEX idx_titled_response_employment_status ON titled_response (current_employment_status);

CREATE TABLE employer_response (
    response_id UUID PRIMARY KEY REFERENCES survey_response(id) ON DELETE CASCADE,
    organization_type VARCHAR(100),
    organization_size VARCHAR(100),
    organization_sector VARCHAR(180),
    hired_graduates_last_five_years BOOLEAN,
    hiring_probability VARCHAR(180),
    demanded_training_level VARCHAR(100),
    organization_department VARCHAR(100),
    branch_presence VARCHAR(100)
);

CREATE INDEX idx_employer_response_type ON employer_response (organization_type);
CREATE INDEX idx_employer_response_size ON employer_response (organization_size);

CREATE TABLE competence_catalog (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(180) NOT NULL,
    competence_group VARCHAR(30) NOT NULL CHECK (competence_group IN ('HARD_SKILL', 'SOFT_SKILL')),
    display_order INTEGER NOT NULL CHECK (display_order > 0),
    UNIQUE (competence_group, display_order)
);

CREATE TABLE competence_rating (
    id BIGSERIAL PRIMARY KEY,
    response_id UUID NOT NULL REFERENCES survey_response(id) ON DELETE CASCADE,
    competence_id BIGINT NOT NULL REFERENCES competence_catalog(id),
    numeric_value SMALLINT CHECK (numeric_value BETWEEN 1 AND 5),
    not_observed BOOLEAN NOT NULL DEFAULT FALSE,
    original_label VARCHAR(100),
    CHECK ((not_observed = TRUE AND numeric_value IS NULL) OR (not_observed = FALSE AND numeric_value IS NOT NULL)),
    UNIQUE (response_id, competence_id)
);

CREATE INDEX idx_competence_rating_competence ON competence_rating (competence_id);

CREATE TABLE import_issue (
    id BIGSERIAL PRIMARY KEY,
    dataset_id UUID NOT NULL REFERENCES dataset_import(id) ON DELETE CASCADE,
    source_row_number INTEGER,
    source_column_index INTEGER,
    source_column_name TEXT,
    original_value TEXT,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('ADVERTENCIA', 'ERROR')),
    issue_code VARCHAR(80) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_import_issue_dataset ON import_issue (dataset_id);

INSERT INTO competence_catalog (code, name, competence_group, display_order) VALUES
    ('programacion_software', 'Programación y desarrollo de software', 'HARD_SKILL', 1),
    ('bases_datos', 'Bases de datos', 'HARD_SKILL', 2),
    ('redes_infraestructura', 'Redes e infraestructura', 'HARD_SKILL', 3),
    ('seguridad_informatica', 'Seguridad informática', 'HARD_SKILL', 4),
    ('analisis_datos', 'Análisis de datos', 'HARD_SKILL', 5),
    ('ingenieria_requisitos', 'Ingeniería de requisitos y modelado de sistemas', 'HARD_SKILL', 6),
    ('gestion_proyectos', 'Gestión de proyectos', 'HARD_SKILL', 7),
    ('cloud_devops', 'Cloud / DevOps', 'HARD_SKILL', 8),
    ('comunicacion', 'Comunicación oral y escrita', 'SOFT_SKILL', 1),
    ('trabajo_equipo', 'Trabajo en equipo', 'SOFT_SKILL', 2),
    ('resolucion_problemas', 'Resolución de problemas', 'SOFT_SKILL', 3),
    ('liderazgo', 'Liderazgo', 'SOFT_SKILL', 4),
    ('ingles_tecnico', 'Inglés técnico', 'SOFT_SKILL', 5),
    ('aprendizaje_autonomo', 'Aprendizaje autónomo', 'SOFT_SKILL', 6)
ON CONFLICT (code) DO NOTHING;
