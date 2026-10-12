import * as XLSX from 'xlsx-js-style'

/**
 * Devuelve un CSV que el importador puede leer. Los .xlsx se convierten aquí, en el navegador,
 * con valores crudos: los números se escriben completos (sin notación científica como 1.76E8)
 * y las fechas quedan como número de serie de Excel, que el backend sabe interpretar.
 */
export async function toUploadableFile(file: File): Promise<File> {
  if (!/\.xlsx$/i.test(file.name)) return file
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) throw new Error('El archivo Excel no contiene hojas con datos.')
  const csv = XLSX.utils.sheet_to_csv(sheet, { FS: ',', RS: '\n', rawNumbers: true, blankrows: false })
  return new File([csv], file.name.replace(/\.xlsx$/i, '.csv'), { type: 'text/csv;charset=utf-8' })
}
