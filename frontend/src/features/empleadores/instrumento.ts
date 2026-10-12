/**
 * Instrumento de la encuesta de empleadores tal como se publicó (form/form_export_empleadores00.json).
 * Es la única fuente de enunciados, opciones y orden de escalas de la sección Empleadores.
 * Las claves de valoración coinciden con las que produce el importador del backend.
 */

export type ValuationGroup = 'formacion' | 'relacion'

export type ValuationItem = {
  key: string
  group: ValuationGroup
  statement: string
}

export const VALUATION_ITEMS: ValuationItem[] = [
  { key: 'valoracion_formacion_1', group: 'formacion', statement: 'La Carrera de Ingeniería de Sistemas de la Universidad Mayor de San Simón brinda confianza a nuestra organización como formadora de profesionales del área tecnológica.' },
  { key: 'valoracion_formacion_2', group: 'formacion', statement: 'Considero que el título profesional otorgado por la Carrera de Ingeniería de Sistemas es consistente con el nivel de formación y las competencias demostradas por sus titulados.' },
  { key: 'valoracion_formacion_3', group: 'formacion', statement: 'Las autoridades de la Carrera de Ingeniería de Sistemas consultan regularmente nuestra opinión como empleadores respecto al perfil profesional y las competencias requeridas en el ámbito laboral.' },
  { key: 'valoracion_formacion_4', group: 'formacion', statement: 'Conozco el perfil profesional y las competencias de egreso declaradas por la Carrera de Ingeniería de Sistemas.' },
  { key: 'valoracion_formacion_5', group: 'formacion', statement: 'El perfil profesional declarado por la Carrera de Ingeniería de Sistemas es coherente con el desempeño laboral demostrado por sus titulados.' },
  { key: 'valoracion_formacion_6', group: 'formacion', statement: 'La formación proporcionada por la Carrera de Ingeniería de Sistemas permite a sus titulados alcanzar un desempeño destacado tanto en el ámbito profesional como en su formación integral.' },
  { key: 'valoracion_formacion_7', group: 'formacion', statement: 'La Carrera de Ingeniería de Sistemas considera nuestra opinión como empleadores e incorpora las necesidades del sector laboral en la definición y mejora de actividades de formación práctica, pasantías y modalidades de titulación.' },
  { key: 'valoracion_formacion_8', group: 'formacion', statement: 'El desempeño profesional de los titulados de Ingeniería de Sistemas evidencia el desarrollo de competencias laborales como: comunicación efectiva, análisis y resolución de problemas, pensamiento crítico, aprendizaje continuo, trabajo en equipo, iniciativa personal y manejo adecuado de tecnologías de información.' },
  { key: 'valoracion_formacion_9', group: 'formacion', statement: 'Los profesionales titulados de Ingeniería de Sistemas demuestran valores y actitudes relacionados con la ética profesional, responsabilidad social, inclusión, diversidad, respeto a los derechos humanos y compromiso con el medio ambiente.' },
  { key: 'valoracion_formacion_10', group: 'formacion', statement: 'He participado en procesos de recopilación de información, evaluación o retroalimentación relacionados con el desempeño laboral de los titulados de la Carrera de Ingeniería de Sistemas.' },
  { key: 'valoracion_relacion_1', group: 'relacion', statement: 'La Carrera de Ingeniería de Sistemas mantiene vínculos con organizaciones e instituciones que generan oportunidades laborales para sus titulados.' },
  { key: 'valoracion_relacion_2', group: 'relacion', statement: 'He participado en actividades de vinculación con el entorno laboral y tecnológico organizadas por la Carrera de Ingeniería de Sistemas o la Facultad de Ciencias y Tecnología.' },
  { key: 'valoracion_relacion_3', group: 'relacion', statement: 'He participado en actividades de difusión de oportunidades laborales, convocatorias, pasantías o prácticas profesionales organizadas por la Carrera de Ingeniería de Sistemas.' },
  { key: 'valoracion_relacion_4', group: 'relacion', statement: 'He participado en actividades de vinculación entre profesionales del sector tecnológico, empleadores, docentes y estudiantes de la Carrera de Ingeniería de Sistemas para el intercambio de conocimientos, experiencias y desarrollo de trabajos conjuntos.' },
  { key: 'valoracion_relacion_5', group: 'relacion', statement: 'Como empleador, he sido consultado sobre el desempeño profesional de los titulados de Ingeniería de Sistemas, con el propósito de retroalimentar el perfil profesional y el plan de estudios de la Carrera.' },
  { key: 'valoracion_relacion_6', group: 'relacion', statement: 'Como empleador, la Carrera de Ingeniería de Sistemas ha consultado nuestra opinión respecto a la pertinencia de la formación impartida y su correspondencia con las necesidades del sector tecnológico y laboral.' },
  { key: 'valoracion_relacion_7', group: 'relacion', statement: 'Cuando nuestra organización requiere profesionales del área de Sistemas, recurrimos a la Universidad Mayor de San Simón y a la Carrera de Ingeniería de Sistemas como fuente de búsqueda de talento profesional.' },
  { key: 'valoracion_relacion_8', group: 'relacion', statement: 'He sido consultado periódicamente por la Carrera de Ingeniería de Sistemas durante sus procesos de autoevaluación y mejora continua.' },
]

export const VALUATION_GROUP_LABELS: Record<ValuationGroup, string> = {
  formacion: 'Formación y perfil',
  relacion: 'Relación con la Carrera',
}

/** Escala de acuerdo, de menos a más. Las etiquetas son las del formulario. */
export const AGREEMENT_SCALE = [
  { value: 'Totalmente desacuerdo', color: '#E4572E' },
  { value: 'Parcialmente de acuerdo', color: '#8DB8E0' },
  { value: 'Totalmente de acuerdo', color: '#1F6FB5' },
] as const

/** Respuesta que no entra en la escala: se muestra aparte, en gris. */
export const NO_KNOW_LABEL = 'No sabe'
export const NEUTRAL_GRAY = '#94A3B8'

/** Escala de suficiencia de competencias (1 a 5) y su color en el mapa de calor. */
export const SUFFICIENCY_SCALE = [
  { level: 1, label: 'Muy insuficiente', color: '#E4572E' },
  { level: 2, label: 'Insuficiente', color: '#F4A98A' },
  { level: 3, label: 'Aceptable', color: '#F1F5F9' },
  { level: 4, label: 'Suficiente', color: '#8DB8E0' },
  { level: 5, label: 'Muy suficiente', color: '#1F6FB5' },
] as const

export const NOT_OBSERVED_LABEL = 'No observado'

export const ORGANIZATION_TYPE_OPTIONS = ['Público', 'Privado'] as const

/** Tamaños en el orden de la escala (Micro → Grande), con las etiquetas del formulario. */
export const ORGANIZATION_SIZE_ORDER = [
  'Micro (hasta 10 funcionarios)',
  'Pequeña (entre 11 a 30 funcionarios)',
  'Mediana (entre 31 a 99 funcionarios)',
  'Grande (100 funcionarios o más)',
] as const

/** Nivel de formación demandado, en el orden del formulario (de menor a mayor). */
export const DEMANDED_LEVEL_ORDER = [
  'Licenciatura',
  'Diplomado',
  'Especialidad',
  'Maestría',
  'Doctorado',
  'Post- doctorado',
] as const

export const HIRING_PROBABILITY_HIGH = 'Sí, existe una alta probabilidad de contratación'

/** Campos que la sección puede cruzar: todos de opción única o escala, ninguno de texto libre. */
export const CROSS_FIELD_OPTIONS = [
  { key: 'tipo_organizacion', label: 'Tipo de organización', group: 'Perfil' },
  { key: 'tamano_organizacion', label: 'Tamaño de la organización', group: 'Perfil' },
  { key: 'rubro_organizacion', label: 'Rubro o sector principal', group: 'Perfil' },
  { key: 'departamento_organizacion', label: 'Departamento', group: 'Perfil' },
  { key: 'presencia_sedes', label: 'Presencia de sedes', group: 'Perfil' },
  { key: 'contrato_titulados_ultimos_5_anios', label: 'Contratación en los últimos 5 años', group: 'Contratación' },
  { key: 'posibilidad_incorporacion', label: 'Posibilidad de incorporar ingenieros', group: 'Contratación' },
  { key: 'nivel_formacion_demandado', label: 'Nivel de formación que demanda', group: 'Contratación' },
  { key: 'medio_convocatoria', label: 'Medio de convocatoria', group: 'Contratación' },
] as const

/** Competencias del formulario: hard skills y soft skills, en el orden del formulario. */
export const COMPETENCE_ORDER = [
  'Programación y desarrollo de software',
  'Bases de datos',
  'Redes e infraestructura',
  'Seguridad informática',
  'Análisis de datos',
  'Ingeniería de requisitos y modelado de sistemas',
  'Gestión de proyectos',
  'Cloud / DevOps',
  'Comunicación oral y escrita',
  'Trabajo en equipo',
  'Resolución de problemas',
  'Liderazgo',
  'Inglés técnico',
  'Aprendizaje autónomo',
] as const
