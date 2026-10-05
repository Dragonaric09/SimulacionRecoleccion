# ⚡ GUÍA RÁPIDA - TSS ANALYZER

Comienza a usar el Sistema de Análisis de Mercado en 5 minutos.

---

## ✅ Verificación Previa

- ✓ Java 11+ instalado: `java -version`
- ✓ Maven 3.6+ instalado: `mvn -version`
- ✓ Git (opcional)

---

## 🚀 Iniciar en 3 Pasos

### PASO 1: Compilar
```bash
cd /home/claude
mvn clean package
```
**Resultado esperado:** `BUILD SUCCESS` + archivo `tss-analyzer.jar`

### PASO 2: Ejecutar
```bash
java -jar target/tss-analyzer.jar
```

### PASO 3: ¡Listo!
Interfaz gráfica abre automáticamente.

---

## 📊 Tu Primer Análisis (5 minutos)

### 1. Crear Datos de Prueba
**Menú:** ⚙️ Configuración → 🔍 Probar Conexión a Base de Datos
- Verifica conexión a SQLite ✓

### 2. Ingresar Datos
**Tab:** 📝 Encuestas
- Click en **"📋 Encuesta Titulados"**
- Completa formulario de ejemplo

### 3. Visualizar Análisis
**Tab:** 📈 Análisis
- Click en **"Estadísticas Descriptivas"**
- Ver: media, mediana, desviación estándar

### 4. Generar Reporte
**Tab:** 📄 Reportes
- Click en **"Exportar a Excel"**
- Archivo guardado en `reportes/`

---

## 🎮 Controles Principales

| Acción | Ubicación |
|--------|-----------|
| Nueva encuesta | Tab: 📝 Encuestas |
| Ver estadísticas | Tab: 📈 Análisis |
| Crear gráfico | Tab: 📉 Gráficos |
| Exportar datos | Tab: 📄 Reportes |
| Configurar BD | Tab: ⚙️ Configuración |

---

## 📈 Tipos de Análisis Disponibles

```
INMEDIATO (Ya funcionan):
✓ Estadísticas descriptivas (media, mediana, etc.)
✓ Cálculo de frecuencias
✓ Distribuciones por categoría

EN DESARROLLO:
⏳ Prueba Chi-cuadrado
⏳ Análisis de correlación
⏳ Gráficos interactivos
⏳ Exportación a PDF
```

---

## 🗄️ Datos de Prueba

### Para Probar Rápido:
1. **Titulado ejemplo:**
   - Edad: 35 años o más
   - Género: Hombre
   - Año egreso: 2020
   - Años de vida profesional: 6
   - Situación laboral: Trabaja

2. **Empleador ejemplo:**
   - Empresa: TechCorp Bolivia
   - Tipo: Privado
   - Tamaño: Grande
   - Sector: Desarrollo de software

---

## 🔍 Donde Encontrar Ayuda

| Elemento | Acción |
|----------|--------|
| Menú Inicio | Información general del sistema |
| Menú Ayuda → Acerca de | Detalles del proyecto |
| Menú Ayuda → Manual | Documentación completa |
| README.md | Guía detallada |

---

## ❌ Problemas Comunes

**Problema:** "Build failed"
```
Solución: mvn clean install
```

**Problema:** "Cannot find JAR file"
```
Solución: Verificar carpeta target/
mvn clean package
```

**Problema:** "Base de datos vacía"
```
Solución: Ingresar datos en tab "Encuestas"
O probar conexión: ⚙️ → 🔍 Probar Conexión
```

---

## 📚 Próximos Pasos

1. Leer README.md (guía completa)
2. Explorar tabs de Encuestas
3. Probar análisis con datos reales
4. Generar reportes en Excel

---

## 💡 Consejos

- 💾 **Datos Complejos:** Usa el sistema con datos de 100+ registros para análisis significativos
- 📊 **Mejor Visualización:** Zoom de pantalla (Ctrl + +/-) para gráficos
- 🔄 **Refrescar BD:** Cierra y reabre la app si cambias datos directamente en SQLite
- 📄 **Exportación:** Asegurate que carpeta `reportes/` exista con permisos de escritura

---

## ✨ ¿Funciona Bien?

Si todo marcha correctamente deberías ver:
- ✓ Ventana principal con 6 tabs
- ✓ Conexión a BD exitosa en Configuración
- ✓ Botones activos en todas las tabs
- ✓ Menús desplegables funcionales

**¡Éxito! Estás listo para comenzar el análisis.** 🚀

---

**Versión:** 1.0 | **Última actualización:** 2026-09-30
