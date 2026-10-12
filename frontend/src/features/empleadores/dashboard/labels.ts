/** Etiquetas cortas y neutrales para los gráficos. El enunciado completo queda en el tooltip o en la tabla. */
import { VALUATION_ITEMS } from '../instrumento'

const SHORT_VALUATION: Record<string, string> = {
  valoracion_formacion_1: 'Brinda confianza',
  valoracion_formacion_2: 'Título consistente con competencias',
  valoracion_formacion_3: 'Autoridades consultan la opinión',
  valoracion_formacion_4: 'Conoce el perfil de egreso',
  valoracion_formacion_5: 'Perfil coherente con el desempeño',
  valoracion_formacion_6: 'Formación permite desempeño destacado',
  valoracion_formacion_7: 'Incorpora necesidades del sector',
  valoracion_formacion_8: 'Evidencia competencias laborales',
  valoracion_formacion_9: 'Valores y actitudes de los titulados',
  valoracion_formacion_10: 'Participa en retroalimentación',
  valoracion_relacion_1: 'Mantiene vínculos con organizaciones',
  valoracion_relacion_2: 'Participa en vinculación con el entorno',
  valoracion_relacion_3: 'Participa en difusión de oportunidades',
  valoracion_relacion_4: 'Participa en vinculación profesional',
  valoracion_relacion_5: 'Ha sido consultado sobre el desempeño',
  valoracion_relacion_6: 'Consulta sobre pertinencia de la formación',
  valoracion_relacion_7: 'Recurre a la Universidad para contratar',
  valoracion_relacion_8: 'Es consultado periódicamente',
}

export function valuationLabel(key: string) {
  return SHORT_VALUATION[key] ?? VALUATION_ITEMS.find((item) => item.key === key)?.statement ?? key
}

export function valuationStatement(key: string) {
  return VALUATION_ITEMS.find((item) => item.key === key)?.statement ?? key
}

const SHORT_COMPETENCE: Record<string, string> = {
  programacion_software: 'Programación',
  bases_datos: 'Bases de datos',
  redes_infraestructura: 'Redes',
  seguridad_informatica: 'Seguridad',
  analisis_datos: 'Análisis de datos',
  ingenieria_requisitos: 'Requisitos y modelado',
  gestion_proyectos: 'Gestión de proyectos',
  cloud_devops: 'Cloud / DevOps',
  comunicacion: 'Comunicación',
  trabajo_equipo: 'Trabajo en equipo',
  resolucion_problemas: 'Resolución de problemas',
  liderazgo: 'Liderazgo',
  ingles_tecnico: 'Inglés técnico',
  aprendizaje_autonomo: 'Aprendizaje autónomo',
}

export function competenceLabel(code: string, fallback: string) {
  return SHORT_COMPETENCE[code] ?? fallback
}

const SHORT_PROBABILITY: Record<string, string> = {
  'Sí, existe una alta probabilidad de contratación': 'Alta probabilidad',
  'Sí, dependiendo del crecimiento o nuevos proyectos de la organización': 'Depende del crecimiento',
  'No se tiene prevista la contratación actualmente': 'No prevista',
  'No requiere profesionales del área de Sistemas': 'No requiere',
}

export function probabilityLabel(value: string) {
  return SHORT_PROBABILITY[value] ?? value
}

/** Tamaños con etiqueta corta, en el orden de la escala de Micro a Grande. */
export const SIZE_SHORT_LABEL: Record<string, string> = {
  'Micro (hasta 10 funcionarios)': 'Micro (≤ 10)',
  'Pequeña (entre 11 a 30 funcionarios)': 'Pequeña (11–30)',
  'Mediana (entre 31 a 99 funcionarios)': 'Mediana (31–99)',
  'Grande (100 funcionarios o más)': 'Grande (≥ 100)',
}
