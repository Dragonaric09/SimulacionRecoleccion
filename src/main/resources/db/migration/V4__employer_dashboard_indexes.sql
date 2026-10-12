-- Agregados por respuesta de empleadores (se calculan en la importación) para el dashboard y la tabla detallada.
ALTER TABLE employer_response
    ADD COLUMN competence_average NUMERIC(4,2),
    ADD COLUMN valuations_full_agreement SMALLINT NOT NULL DEFAULT 0
        CHECK (valuations_full_agreement BETWEEN 0 AND 18);

-- Consultas por dataset, estado y periodo (series temporales, ventanas de comparación).
CREATE INDEX idx_survey_response_dataset_status_date
    ON survey_response (dataset_id, response_status, submitted_at);

-- Promedios de competencias por respuesta sin recorrer toda la tabla.
CREATE INDEX idx_competence_rating_response ON competence_rating (response_id);
