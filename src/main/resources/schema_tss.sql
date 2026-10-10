-- ESQUEMA DE BASE DE DATOS PARA ANÁLISIS DE MERCADO (PostgreSQL)

CREATE TABLE IF NOT EXISTS titulados (
    id_titulado SERIAL PRIMARY KEY,
    edad VARCHAR(50) NOT NULL,
    genero VARCHAR(50) NOT NULL,
    año_egreso INTEGER NOT NULL,
    realizo_postgrado VARCHAR(20) NOT NULL,
    tipo_postgrado VARCHAR(100),
    nivel_postgrado VARCHAR(100),
    institucion_postgrado VARCHAR(255),
    financiamiento_postgrado VARCHAR(100),
    nombre_programa VARCHAR(255),
    interes_postgrado_futuro VARCHAR(100) NOT NULL,
    area_interes VARCHAR(255),
    institucion_preferida VARCHAR(255),
    opinion_postgrado_fcyt INTEGER,
    existe_programas_afines INTEGER,
    años_vida_profesional INTEGER,
    años_desempleado INTEGER,
    situacion_laboral VARCHAR(100) NOT NULL,
    origen_emprendimiento VARCHAR(255),
    tipo_entregable VARCHAR(255),
    financiamiento_externo VARCHAR(255),
    satisfaccion_negocio INTEGER,
    importancia_formacion_negocio INTEGER,
    primer_empleo VARCHAR(255) NOT NULL,
    tiempo_primer_empleo VARCHAR(100),
    cantidad_empleos INTEGER,
    satisfaccion_formacion INTEGER,
    concordancia_formacion_mercado INTEGER,
    util_practicas_teoricas TEXT,
    util_pasantias TEXT,
    util_horarios TEXT,
    util_habilidades_analiticas TEXT,
    util_equipos_multidisciplinarios TEXT,
    util_herramientas_software TEXT,
    mejora_integracion_teoria TEXT,
    mejora_relacion_empresas TEXT,
    mejora_horarios TEXT,
    mejora_actualizacion_plan TEXT,
    mejora_actividades_extracurriculares TEXT,
    mejora_especializaciones TEXT,
    asignaturas_utiles TEXT,
    asignaturas_no_utiles TEXT,
    interes_red_contactos VARCHAR(100) NOT NULL,
    email_contacto VARCHAR(255),
    telefono_contacto VARCHAR(50),
    whatsapp_contacto VARCHAR(50),
    linkedin_url VARCHAR(255),
    fecha_respuesta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completado INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS empleadores (
    id_empleador SERIAL PRIMARY KEY,
    email_contacto VARCHAR(255) NOT NULL,
    nombre_empresa VARCHAR(255) NOT NULL,
    tipo_organizacion VARCHAR(100) NOT NULL,
    tamaño_organizacion VARCHAR(100) NOT NULL,
    rubro_sector VARCHAR(255) NOT NULL,
    contratacion_ultimos_5años VARCHAR(100) NOT NULL,
    posibilidad_contratacion_futura VARCHAR(100),
    nivel_formacion_demandado VARCHAR(100),
    convoca_medios_escritos TEXT,
    convoca_internet TEXT,
    convoca_competitiva TEXT,
    convoca_personal TEXT,
    convoca_recomendaciones TEXT,
    convoca_otros TEXT,
    cargo_apoyo TEXT,
    cargo_tecnico TEXT,
    cargo_analista TEXT,
    cargo_especialista TEXT,
    cargo_supervisor TEXT,
    cargo_jefatura TEXT,
    cargo_consultor TEXT,
    cargo_otro TEXT,
    areas_conocimiento_emergentes TEXT,
    herramientas_tecnologicas TEXT,
    competencias_fundamentales TEXT,
    opinion_confianza_formadora INTEGER,
    opinion_titulo_consistente INTEGER,
    opinion_consulta_regularmente INTEGER,
    opinion_conoce_perfil INTEGER,
    opinion_perfil_coherente INTEGER,
    opinion_desempeño_destacado INTEGER,
    opinion_incorpora_necesidades INTEGER,
    opinion_competencias_laborales INTEGER,
    opinion_valores_actitudes INTEGER,
    opinion_participacion_retroalimentacion INTEGER,
    fecha_respuesta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completado INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS analisis_resultados (
    id_analisis SERIAL PRIMARY KEY,
    tipo_analisis VARCHAR(100) NOT NULL,
    variable1 VARCHAR(100),
    variable2 VARCHAR(100),
    resultado_json TEXT,
    fecha_generacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reportes (
    id_reporte SERIAL PRIMARY KEY,
    nombre_reporte VARCHAR(255) NOT NULL,
    tipo_reporte VARCHAR(100) NOT NULL,
    ruta_archivo VARCHAR(500),
    fecha_generacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_generador VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_titulados_año_egreso ON titulados(año_egreso);
CREATE INDEX IF NOT EXISTS idx_titulados_situacion_laboral ON titulados(situacion_laboral);
CREATE INDEX IF NOT EXISTS idx_titulados_area_interes ON titulados(area_interes);
CREATE INDEX IF NOT EXISTS idx_empleadores_sector ON empleadores(rubro_sector);
CREATE INDEX IF NOT EXISTS idx_empleadores_tamaño ON empleadores(tamaño_organizacion);