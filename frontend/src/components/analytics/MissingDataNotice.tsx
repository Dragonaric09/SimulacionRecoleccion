import { useEffect, useState } from 'react'
import { apiRequest } from '@/api/client'
import { StatusPanel } from '@/components/analytics/StatusPanel'

type MissingQuestion = { columnName: string | null; message: string }

/** Preguntas ausentes por dataset: se piden una vez por sesión y se comparten entre pantallas. */
const cache = new Map<string, Promise<MissingQuestion[]>>()

function missingQuestions(datasetId: string) {
  let pending = cache.get(datasetId)
  if (!pending) {
    pending = apiRequest<MissingQuestion[]>(`/datasets/${encodeURIComponent(datasetId)}/missing-questions`).catch(() => {
      cache.delete(datasetId)
      return []
    })
    cache.set(datasetId, pending)
  }
  return pending
}

/**
 * Aviso de sección sin datos. Cuando el archivo importado no trae preguntas que esta sección necesita, lo dice
 * de forma explícita: una pantalla vacía sin explicación parece un fallo del sistema.
 *
 * @param sections nombres de sección que aparecen en el impacto de cada pregunta ausente (p. ej. «Financiamiento»)
 * @param emptyWhen preguntas sin las cuales la sección entera queda vacía; si falta alguna el aviso lo dice así
 */
export function MissingDataNotice({
  datasetIds,
  sections,
  emptyWhen = [],
}: {
  datasetIds: (string | undefined)[]
  sections: string[]
  emptyWhen?: string[]
}) {
  const [questions, setQuestions] = useState<MissingQuestion[]>([])
  const key = datasetIds.filter(Boolean).join('|')

  useEffect(() => {
    let active = true
    const ids = key ? key.split('|') : []
    Promise.all(ids.map(missingQuestions)).then((lists) => {
      if (active) setQuestions(lists.flat())
    })
    return () => {
      active = false
    }
  }, [key])

  const relevant = questions.filter((question) => sections.some((section) => question.message.includes(section)))
  if (relevant.length === 0) return null
  const empty = relevant.some((question) => emptyWhen.some((name) => question.columnName?.startsWith(name)))
  return (
    <div className="print-hide mx-auto mb-5 w-full max-w-7xl">
      <StatusPanel
        kind="warning"
        title={empty ? 'Esta sección está vacía por falta de información' : 'Parte de esta sección no tiene datos'}
        description={
          empty
            ? 'Por falta de información en el archivo subido, esta sección estará vacía. No es un fallo del sistema: el formulario importado no incluye estas preguntas.'
            : 'Por falta de información en el archivo subido, algunas gráficas o indicadores de esta sección estarán vacíos. El resto se calcula con normalidad.'
        }
      >
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          {relevant.map((question) => (
            <li key={question.message}>{question.message}</li>
          ))}
        </ul>
      </StatusPanel>
    </div>
  )
}
