-- ============================================================================
-- SCHEMA DE BASE DE DATOS PARA ANÁLISIS DE MERCADO - INGENIERÍA EN SISTEMAS
-- Universidad Mayor de San Simón
-- ============================================================================

-- Tabla: Encuestas de Titulados
CREATE TABLE IF NOT EXISTS titulados (
    id_titulado INTEGER PRIMARY KEY AUTOINCREMENT,
    edad TEXT NOT NULL,
    genero TEXT NOT NULL,
    año_egreso INTEGER NOT NULL,
    
    -- Formación Continua
    realizo_postgrado TEXT NOT NULL, -- SI/NO
    tipo_postgrado TEXT, -- DIPLOMADO, ESPECIALIDAD, MAESTRIA, DOCTORADO, POS_DOCTORADO
    nivel_postgrado TEXT, -- DIPL, ESP, MAEST, DOCT, POSDOCT
    institucion_postgrado TEXT, -- EUPG, DIR_POSTGRADO, IBNORCA, INT, PUB_NAC, PRIV_NAC, OTRO
    financiamiento_postgrado TEXT, -- RECURSOS_PROPIOS, BECA_TOTAL, BECA_PARCIAL
    nombre_programa TEXT,
    
    -- Interés en Posgrados Futuros
    interes_postgrado_futuro TEXT NOT NULL, -- SI/NO
    area_interes TEXT, -- IA, ROBOTICA, SOFTWARE, BD, REDES_SEGURIDAD
    institucion_preferida TEXT, -- EUPG, DIR_POSTGRADO, IBNORCA, INT, PUB_NAC, PRIV_NAC, OTRO
    opinion_postgrado_fcyt INTEGER, -- Likert 1-4: 1=Totalmente desacuerdo, 4=Totalmente acuerdo
    existe_programas_afines INTEGER, -- Likert 1-4
    
    -- Vida Profesional
    años_vida_profesional INTEGER,
    años_desempleado INTEGER,
    situacion_laboral TEXT NOT NULL, -- TRABAJA, NO_TRABAJA, EMPRENDIMIENTO
    
    -- Si tiene emprendimiento
    origen_emprendimiento TEXT, -- IDEA_PROPIA, IDEA_CONJUNTA, STARTUP, SPINOFF, OTRO
    tipo_entregable TEXT, -- PRODUCTO, SERVICIO, AMBOS
    financiamiento_externo TEXT, -- SI_PRESTAMOS, SI_INVERSORES, NO_PROPIO
    satisfaccion_negocio INTEGER, -- Likert 1-3: 1=Insatisfecho, 3=Satisfecho
    importancia_formacion_negocio INTEGER, -- Likert 1-4: 1=No importante, 4=Muy importante
    
    -- Empleo Actual
    primer_empleo TEXT NOT NULL, -- SI/NO
    tiempo_primer_empleo TEXT, -- YA_TRABAJABA, MENOS_1MES, 1_4MESES, 4_8MESES, 8_12MESES, MAS_12MESES
    cantidad_empleos INTEGER, -- 1, 2, 3, MAS_3
    satisfaccion_formacion INTEGER, -- Likert 1-4
    concordancia_formacion_mercado INTEGER, -- Likert 1-4
    
    -- Aspectos Útiles de la Carrera (Multiple)
    util_practicas_teoricas TEXT, -- JSON array o separado por comas
    util_pasantias TEXT,
    util_horarios TEXT,
    util_habilidades_analiticas TEXT,
    util_equipos_multidisciplinarios TEXT,
    util_herramientas_software TEXT,
    
    -- Aspectos a Mejorar (Multiple)
    mejora_integracion_teoria TEXT,
    mejora_relacion_empresas TEXT,
    mejora_horarios TEXT,
    mejora_actualizacion_plan TEXT,
    mejora_actividades_extracurriculares TEXT,
    mejora_especializaciones TEXT,
    
    -- Asignaturas Útiles (Seleccionar 5)
    asignaturas_utiles TEXT, -- JSON array
    
    -- Asignaturas NO Útiles (Seleccionar 2)
    asignaturas_no_utiles TEXT, -- JSON array
    
    -- Contacto e Integración
    interes_red_contactos TEXT NOT NULL, -- SI/NO
    email_contacto TEXT,
    telefono_contacto TEXT,
    whatsapp_contacto TEXT,
    linkedin_url TEXT,
    
    -- Metadatos
    fecha_respuesta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completado INTEGER DEFAULT 1 -- 1=Completo, 0=Incompleto
);

-- Tabla: Encuestas de Empleadores
CREATE TABLE IF NOT EXISTS empleadores (
    id_empleador INTEGER PRIMARY KEY AUTOINCREMENT,
    email_contacto TEXT NOT NULL,
    nombre_empresa TEXT NOT NULL,
    tipo_organizacion TEXT NOT NULL, -- PUBLICO/PRIVADO
    tamaño_organizacion TEXT NOT NULL, -- GRANDE, MEDIANA, PEQUEÑA, MICRO
    rubro_sector TEXT NOT NULL, -- Desarrollo SW, Servicios TI, Telecomunicaciones, etc.
    
    -- Empleabilidad
    contratacion_ultimos_5años TEXT NOT NULL, -- SI/NO
    posibilidad_contratacion_futura TEXT, -- ALTA, DEPENDIENTE, NO_PREVISTA, NO_REQUIERE
    nivel_formacion_demandado TEXT, -- Licenciatura, Diplomado, Especialidad, Maestría, Doctorado, Postdoctorado
    
    -- Medios de Convocatoria (Multiple)
    convoca_medios_escritos TEXT,
    convoca_internet TEXT,
    convoca_competitiva TEXT,
    convoca_personal TEXT,
    convoca_recomendaciones TEXT,
    convoca_otros TEXT,
    
    -- Cargos Desempeñados (Multiple)
    cargo_apoyo TEXT,
    cargo_tecnico TEXT,
    cargo_analista TEXT,
    cargo_especialista TEXT,
    cargo_supervisor TEXT,
    cargo_jefatura TEXT,
    cargo_consultor TEXT,
    cargo_otro TEXT,
    
    -- Nuevas Áreas y Tecnologías
    areas_conocimiento_emergentes TEXT, -- Text area - respuesta libre
    herramientas_tecnologicas TEXT, -- Text area - respuesta libre
    competencias_fundamentales TEXT, -- Text area - respuesta libre
    
    -- Opinión sobre Formación y Perfil Profesional (Likert: 1=Totalmente desacuerdo, 4=Totalmente acuerdo)
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
    
    -- Metadatos
    fecha_respuesta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completado INTEGER DEFAULT 1 -- 1=Completo, 0=Incompleto
);

-- Tabla: Análisis Generado (para guardar resultados de análisis)
CREATE TABLE IF NOT EXISTS analisis_resultados (
    id_analisis INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo_analisis TEXT NOT NULL, -- descriptivo, bivariado, chi2, etc.
    variable1 TEXT,
    variable2 TEXT,
    resultado_json TEXT, -- Guardar resultado en JSON para flexibilidad
    fecha_generacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: Reportes Exportados
CREATE TABLE IF NOT EXISTS reportes (
    id_reporte INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre_reporte TEXT NOT NULL,
    tipo_reporte TEXT NOT NULL, -- PDF, EXCEL, HTML
    ruta_archivo TEXT,
    fecha_generacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_generador TEXT
);

-- Índices para optimización
CREATE INDEX idx_titulados_año_egreso ON titulados(año_egreso);
CREATE INDEX idx_titulados_situacion_laboral ON titulados(situacion_laboral);
CREATE INDEX idx_titulados_area_interes ON titulados(area_interes);
CREATE INDEX idx_empleadores_sector ON empleadores(rubro_sector);
CREATE INDEX idx_empleadores_tamaño ON empleadores(tamaño_organizacion);
