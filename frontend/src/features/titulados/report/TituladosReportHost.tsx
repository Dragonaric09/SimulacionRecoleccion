import { useCallback, useEffect, useRef, useState } from 'react'
import { useDatasets } from '@/features/analitica/shared/AnalyticsPrimitives'
import { TituladosReport } from './TituladosReport'

export const TITULADOS_REPORT_EVENT = 'simulacionem:titulados-report'

function today() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/La_Paz',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

/** Monta el informe de Titulados únicamente para imprimir, sin reutilizar la vista interactiva. */
export function TituladosReportHost() {
  const { datasets, datasetId } = useDatasets('TITULADOS')
  const [job, setJob] = useState<number | null>(null)
  const printed = useRef<number | null>(null)

  useEffect(() => {
    const start = () => setJob(Date.now())
    window.addEventListener(TITULADOS_REPORT_EVENT, start)
    return () => window.removeEventListener(TITULADOS_REPORT_EVENT, start)
  }, [])

  const onReady = useCallback(() => {
    if (job === null || printed.current === job) return
    printed.current = job
    window.setTimeout(() => {
      const previousTitle = document.title
      document.title = `titulados_informe_${today()}`
      document.documentElement.classList.add('printing-titulados-report')
      const done = () => {
        document.title = previousTitle
        document.documentElement.classList.remove('printing-titulados-report')
        window.removeEventListener('afterprint', done)
        setJob(null)
      }
      window.addEventListener('afterprint', done)
      window.print()
    }, 150)
  }, [job])

  if (job === null || !datasetId) return null
  const dataset = datasets.find((item) => item.id === datasetId)
  const datasetName = dataset
    ? `${dataset.displayName || dataset.sourceFileName} · ${dataset.rowsValid} válidas`
    : datasetId
  return (
    <TituladosReport key={job} datasetId={datasetId} datasetName={datasetName} onReady={onReady} />
  )
}
