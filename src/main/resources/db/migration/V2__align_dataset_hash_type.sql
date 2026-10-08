-- La V1 definió el hash como CHAR(64). VARCHAR(64) coincide con el mapeo JPA
-- y evita espacios de relleno al trabajar con el valor desde la aplicación.
ALTER TABLE dataset_import
    ALTER COLUMN source_file_sha256 TYPE VARCHAR(64);
