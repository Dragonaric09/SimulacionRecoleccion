import { Download, FileImage, FileSpreadsheet, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ExportActions() {
  return <div className="flex flex-wrap gap-2" aria-label="Opciones de exportación">
    <Button variant="outline" size="sm"><FileText />CSV</Button>
    <Button variant="outline" size="sm"><FileSpreadsheet />Excel</Button>
    <Button variant="outline" size="sm"><FileImage />PNG</Button>
    <Button variant="secondary" size="sm"><Download />Exportar</Button>
  </div>
}

