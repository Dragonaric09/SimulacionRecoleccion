import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    // Librerías que se cargan con import() solo al importar o exportar. Si Vite las descubre recién en ese
    // momento, vuelve a optimizar dependencias con la página abierta y la carga falla con «504 Outdated Optimize
    // Dep». Declaradas aquí, quedan listas al arrancar el servidor.
    include: ['xlsx-js-style', 'pdfmake/build/pdfmake', 'pdfmake/build/vfs_fonts', 'html-to-image'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.SERVER_PORT ?? 8081}`,
        changeOrigin: true,
        secure: false,
        // Si el backend no está corriendo, Vite respondería un 500 genérico. Aquí se responde 503 con la causa.
        configure: (proxy) => {
          proxy.on('error', (_error, _req, res) => {
            if ('writeHead' in res && !res.headersSent) {
              res.writeHead(503, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({
                message: `Backend no disponible en http://localhost:${process.env.SERVER_PORT ?? 8081}. Arráncalo con start-dev.ps1 o con .\\mvnw.cmd spring-boot:run -DskipFrontend.`,
              }))
            }
          })
        },
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
