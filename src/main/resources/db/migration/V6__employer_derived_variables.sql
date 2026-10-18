-- Variables derivadas de empleadores, calculadas en la importación:
--   founded_year       año de inicio de operaciones (texto libre en el formulario, validado como año)
--   top_position_rank  cargo de mayor nivel marcado en la pregunta de casillas sobre cargos:
--                      1 Apoyo, 2 Técnico, 3 Analista, 4 Especialista, 5 Supervisión/coordinación, 6 Jefatura/gerencia.
--                      «Consultor tecnológico» no forma parte de la jerarquía.
ALTER TABLE employer_response
    ADD COLUMN founded_year SMALLINT CHECK (founded_year BETWEEN 1800 AND 2100),
    ADD COLUMN top_position_rank SMALLINT CHECK (top_position_rank BETWEEN 1 AND 6);
