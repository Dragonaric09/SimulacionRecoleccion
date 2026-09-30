import { useEffect, useState } from 'react'
import { apiRequest } from '@/api/client'
import { ChiCuadradoDemo } from '@/features/analitica/ChiCuadradoDemo'

function App() {
  const [estadoApi, setEstadoApi] = useState('verificando…')

  useEffect(() => {
    apiRequest<{ status: string }>('/health')
      .then((r) => setEstadoApi(r.status))
      .catch(() => setEstadoApi('SIN CONEXIÓN'))
  }, [])

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">SimulacionEM</h1>
        <p className="text-sm text-muted-foreground">
          Perfil de titulados de Ingeniería en Sistemas · API: {estadoApi}
        </p>
      </header>
      <ChiCuadradoDemo />
    </main>
  )
}

export default App
