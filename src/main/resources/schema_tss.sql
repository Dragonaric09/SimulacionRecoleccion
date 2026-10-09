-- ============================================================================
-- ESQUEMA DE BASE DE DATOS PARA ANÁLISIS DE MERCADO - INGENIERÍA EN SISTEMAS
-- Universidad Mayor de San Simón
-- ============================================================================

CREATE TABLE IF NOT EXISTS titulados (
    id_titulado INTEGER PRIMARY KEY AUTOINCREMENT,
    edad TEXT NOT NULL,
    genero TEXT NOT NULL,
    año_egreso INTEGER NOT NULL,
    realizo_postgrado TEXT NOT NULL,
    tipo_postgrado TEXT,
    nivel_postgrado TEXT,
    institucion_postgrado TEXT,
    financiamiento_postgrado TEXT,
    nombre_programa TEXT,
    interes_postgrado_futuro TEXT NOT NULL,
    area_interes TEXT,
    institucion_preferida TEXT,
    opinion_postgrado_fcyt INTEGER,
    existe_programas_afines INTEGER,
    años_vida_profesional INTEGER,
    años_desempleado INTEGER,
    situacion_laboral TEXT NOT NULL,
    origen_emprendimiento TEXT,
    tipo_entregable TEXT,
    financiamiento_externo TEXT,
    satisfaccion_negocio INTEGER,
    importancia_formacion_negocio INTEGER,
    primer_empleo TEXT NOT NULL,
    tiempo_primer_empleo TEXT,
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
    interes_red_contactos TEXT NOT NULL,
    email_contacto TEXT,
    telefono_contacto TEXT,
    whatsapp_contacto TEXT,
    linkedin_url TEXT,
    fecha_respuesta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completado INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS empleadores (
    id_empleador INTEGER PRIMARY KEY AUTOINCREMENT,
    email_contacto TEXT NOT NULL,
    nombre_empresa TEXT NOT NULL,
    tipo_organizacion TEXT NOT NULL,
    tamaño_organizacion TEXT NOT NULL,
    rubro_sector TEXT NOT NULL,
    contratacion_ultimos_5años TEXT NOT NULL,
    posibilidad_contratacion_futura TEXT,
    nivel_formacion_demandado TEXT,
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
    id_analisis INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo_analisis TEXT NOT NULL,
    variable1 TEXT,
    variable2 TEXT,
    resultado_json TEXT,
    fecha_generacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reportes (
    id_reporte INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre_reporte TEXT NOT NULL,
    tipo_reporte TEXT NOT NULL,
    ruta_archivo TEXT,
    fecha_generacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_generador TEXT
);

CREATE INDEX IF NOT EXISTS idx_titulados_año_egreso ON titulados(año_egreso);
CREATE INDEX IF NOT EXISTS idx_titulados_situacion_laboral ON titulados(situacion_laboral);
CREATE INDEX IF NOT EXISTS idx_titulados_area_interes ON titulados(area_interes);
CREATE INDEX IF NOT EXISTS idx_empleadores_sector ON empleadores(rubro_sector);
CREATE INDEX IF NOT EXISTS idx_empleadores_tamaño ON empleadores(tamaño_organizacion);