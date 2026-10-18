import { useCallback, useEffect, useRef, useState } from 'react'
import { useDatasets } from '@/features/analitica/shared/AnalyticsPrimitives'
import { loadEmployerFilters, type EmployerFilters } from '../employerData'
import { EmployerReport } from './EmployerReport'

export const EMPLOYER_REPORT_EVENT = 'simulacionem:employer-report'

function today() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/La_Paz', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

/**
 * Monta el informe de empleadores solo cuando se pide el PDF: carga sus datos con los filtros guardados, espera a
 * que estén listos y abre el diálogo de impresión. Al cerrarlo, el informe se desmonta.
 */
export function EmployerReportHost() {
  const { datasets, datasetId } = useDatasets('EMPLEADORES')
  const [job, setJob] = useState<{ id: number; filters: EmployerFilters } | null>(null)
  const printed = useRef<number | null>(null)

  useEffect(() => {
    const start = () => setJob({ id: Date.now(), filters: loadEmployerFilters(datasetId) })
    window.addEventListener(EMPLOYER_REPORT_EVENT, start)
    return () => window.removeEventListener(EMPLOYER_REPORT_EVENT, start)
  }, [datasetId])

  const jobId = job?.id
  const onReady = useCallback(() => {
    if (jobId === undefined || printed.current === jobId) return
    printed.current = jobId
    // Un respiro para que el navegador termine de maquetar el informe antes de imprimir. setTimeout y no
    // requestAnimationFrame: este último no corre si la pestaña está en segundo plano.
    window.setTimeout(() => {
      const previousTitle = document.title
      document.title = `empleadores_informe_${today()}`
      document.documentElement.classList.add('printing-employer-report')
      const done = () => {
        document.title = previousTitle
        document.documentElement.classList.remove('printing-employer-report')
        window.removeEventListener('afterprint', done)
        setJob(null)
      }
      window.addEventListener('afterprint', done)
      window.print()
    }, 150)
  }, [jobId])

  if (!job || !datasetId) return null
  const dataset = datasets.find((item) => item.id === datasetId)
  const datasetName = dataset ? `${dataset.displayName || dataset.sourceFileName} · ${dataset.rowsValid} válidas` : datasetId
  return <EmployerReport key={job.id} datasetId={datasetId} datasetName={datasetName} filters={job.filters} onReady={onReady} />
}
