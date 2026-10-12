-- Valoraciones de empleadores como arreglo compacto (18 posiciones, en el orden del formulario) y
-- columnas tipadas para el canal y los cargos. Evitan leer el JSON de cada respuesta en el dashboard.
-- Códigos: 1 = Totalmente de acuerdo, 2 = Parcialmente de acuerdo, 3 = Totalmente desacuerdo, 4 = No sabe.
ALTER TABLE employer_response
    ADD COLUMN valuations SMALLINT[],
    ADD COLUMN channel VARCHAR(150),
    ADD COLUMN positions TEXT;
