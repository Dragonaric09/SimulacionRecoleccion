ALTER TABLE dataset_import ADD COLUMN display_name VARCHAR(255);
UPDATE dataset_import SET display_name = source_file_name WHERE display_name IS NULL;
ALTER TABLE dataset_import ALTER COLUMN display_name SET NOT NULL;
