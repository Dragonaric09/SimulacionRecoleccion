import { apiRequest } from '@/api/client'

export type Issue = { row: number | null; column: number | null; columnName: string | null; severity: 'ERROR' | 'WARNING' | string; code: string; message: string }
export type ImportReport = { datasetId: string | null; surveyType: string; status: string; rowsRead: number; rowsValid: number; rowsRejected: number; warnings: number; errors: number; issues: Issue[] }
export type DatasetSummary = { id: string; surveyType: string; sourceFileName: string; period: number | null; status: string; rowsRead: number; rowsValid: number; rowsRejected: number; warnings: number; errors: number }

async function sendFile(path: '/datasets/validate' | '/datasets/import', file: File) {
  const form = new FormData()
  form.append('file', file)
  return apiRequest<ImportReport>(path, { method: 'POST', body: form })
}

export const validateDataset = (file: File) => sendFile('/datasets/validate', file)
export const importDataset = (file: File) => sendFile('/datasets/import', file)
export const listDatasets = () => apiRequest<DatasetSummary[]>('/datasets')

