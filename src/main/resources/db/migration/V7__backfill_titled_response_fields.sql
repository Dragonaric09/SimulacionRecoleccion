-- Completa las columnas tipadas de titulados para datasets importados antes de V7.
-- Las nuevas importaciones ya escriben estas columnas directamente desde CsvImportService.
UPDATE titled_response t
SET age_range = COALESCE(t.age_range, NULLIF(s.normalized_payload ->> 'edad_rango', '')),
    gender = COALESCE(t.gender, NULLIF(s.normalized_payload ->> 'genero', '')),
    employment_sector = COALESCE(t.employment_sector, NULLIF(s.normalized_payload ->> 'sector_trabajo', '')),
    supplementary_education = COALESCE(t.supplementary_education,
        CASE lower(trim(s.normalized_payload ->> 'tiene_formacion_complementaria'))
            WHEN 'si' THEN TRUE WHEN 'sí' THEN TRUE WHEN 'true' THEN TRUE WHEN '1' THEN TRUE
            WHEN 'no' THEN FALSE WHEN 'false' THEN FALSE WHEN '0' THEN FALSE ELSE NULL END),
    postgraduate_interest = COALESCE(t.postgraduate_interest,
        CASE lower(trim(s.normalized_payload ->> 'interes_posgrado'))
            WHEN 'si' THEN TRUE WHEN 'sí' THEN TRUE WHEN 'true' THEN TRUE WHEN '1' THEN TRUE
            WHEN 'no' THEN FALSE WHEN 'false' THEN FALSE WHEN '0' THEN FALSE ELSE NULL END),
    professional_years = COALESCE(t.professional_years,
        CASE WHEN (s.normalized_payload ->> 'anios_vida_profesional') ~ '^-?[0-9]+([.,][0-9]+)?$'
             THEN replace(s.normalized_payload ->> 'anios_vida_profesional', ',', '.')::numeric ELSE NULL END),
    unemployment_years = COALESCE(t.unemployment_years,
        CASE WHEN (s.normalized_payload ->> 'anios_desempleo') ~ '^-?[0-9]+([.,][0-9]+)?$'
             THEN replace(s.normalized_payload ->> 'anios_desempleo', ',', '.')::numeric ELSE NULL END),
    current_employment_status = COALESCE(t.current_employment_status, NULLIF(s.normalized_payload ->> 'situacion_laboral_actual', '')),
    current_work_sector = COALESCE(t.current_work_sector, NULLIF(s.normalized_payload ->> 'sector_trabajo_actual', '')),
    current_department = COALESCE(t.current_department, NULLIF(s.normalized_payload ->> 'departamento_trabajo', '')),
    first_employment = COALESCE(t.first_employment,
        CASE lower(trim(COALESCE(s.normalized_payload ->> 'es_primer_empleo', s.normalized_payload ->> 'primera_experiencia_laboral')))
            WHEN 'si' THEN TRUE WHEN 'sí' THEN TRUE WHEN 'true' THEN TRUE WHEN '1' THEN TRUE
            WHEN 'no' THEN FALSE WHEN 'false' THEN FALSE WHEN '0' THEN FALSE ELSE NULL END),
    first_employment_wait = COALESCE(t.first_employment_wait, NULLIF(s.normalized_payload ->> 'tiempo_primer_empleo', '')),
    employment_count = COALESCE(t.employment_count,
        CASE WHEN (s.normalized_payload ->> 'cantidad_empleos') ~ '^[0-9]+$'
             THEN (s.normalized_payload ->> 'cantidad_empleos')::integer ELSE NULL END)
FROM survey_response s
WHERE t.response_id = s.id
  AND s.survey_type = 'TITULADOS';

CREATE INDEX idx_titled_response_filters
    ON titled_response (response_id, postgraduate_interest, gender, age_range);
