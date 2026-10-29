-- Escenarios de simulación con nombre, compartidos por todos los usuarios como los datasets.
-- Se guardan probabilidades (no conteos) para que el escenario se pueda aplicar a otro dataset o segmento.
CREATE TABLE simulation_scenario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(80) NOT NULL,
    description VARCHAR(500),
    variable VARCHAR(80) NOT NULL,
    segment VARCHAR(40) NOT NULL DEFAULT 'all',
    categories TEXT[] NOT NULL,
    probabilities DOUBLE PRECISION[] NOT NULL,
    sample_size INTEGER NOT NULL CHECK (sample_size BETWEEN 1 AND 10000),
    repetitions INTEGER NOT NULL CHECK (repetitions BETWEEN 1 AND 5000),
    seed BIGINT NOT NULL,
    -- Dataset del que partió el escenario; si se elimina, el escenario se conserva sin la referencia.
    dataset_id UUID REFERENCES dataset_import(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (cardinality(categories) = cardinality(probabilities) AND cardinality(categories) > 0)
);

-- Un nombre no se repite dentro de la misma variable, sin distinguir mayúsculas.
CREATE UNIQUE INDEX uq_simulation_scenario_variable_name
    ON simulation_scenario (variable, lower(name));
