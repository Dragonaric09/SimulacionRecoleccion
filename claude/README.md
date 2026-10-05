# 📊 SISTEMA DE ANÁLISIS DE MERCADO - INGENIERÍA EN SISTEMAS

**UMSS | Facultad de Ciencias y Tecnología | Carrera Ingeniería en Sistemas**

Sistema integral para recopilación, análisis y visualización de datos de mercado laboral de titulados de Ingeniería en Sistemas, con enfoque en acreditación ARCUSUR.

---

## 🎯 Características Principales

✅ **Encuestas Interactivas**
- Formularios para titulados (formación continua, empleabilidad, retroalimentación curricular)
- Formularios para empleadores (perfil profesional, competencias demandadas)
- Validación de datos en tiempo real

✅ **Análisis Estadístico**
- Estadística descriptiva (media, mediana, desviación estándar, varianza)
- Análisis de frecuencias y distribuciones
- Prueba Chi-cuadrado (χ²) de independencia
- Análisis de correlación de Pearson
- Tablas de contingencia bivariadas

✅ **Visualización de Datos**
- Gráficos de barras (frecuencias)
- Gráficos de pastel (composiciones)
- Matrices de calor (correlaciones)
- Diagramas de radar (competencias)
- Histogramas de distribuciones

✅ **Generación de Reportes**
- Exportación a Excel (.xlsx)
- Generación de PDFs con análisis
- Tablas y matrices de resultados

✅ **Base de Datos**
- SQLite (sin dependencias externas)
- Esquema optimizado con índices
- Soporte para datos faltantes

---

## 📋 Requisitos

- **Java**: 11 o superior
- **Maven**: 3.6+
- **Base de Datos**: SQLite3 (incluido)
- **Dependencias**: Maven las descarga automáticamente

---

## 🚀 Instalación y Ejecución

### 1️⃣ Descargar Código
```bash
cd /home/claude
```

### 2️⃣ Compilar con Maven
```bash
mvn clean compile
```

### 3️⃣ Empaquetar (JAR ejecutable)
```bash
mvn clean package
```

### 4️⃣ Ejecutar la Aplicación
```bash
# Opción A: Desde Maven
mvn exec:java -Dexec.mainClass="bo.umss.fcyt.tss.ui.MainApplication"

# Opción B: Ejecutar JAR generado
java -jar target/tss-analyzer.jar
```

---

## 📁 Estructura de Directorios

```
proyecto-tss/
├── pom.xml                          # Configuración Maven
├── schema_tss.sql                  # Esquema de base de datos
├── DatabaseConnection.java         # Conexión a BD
├── Titulado.java                   # Modelo de datos
├── Empleador.java                  # Modelo de datos
├── TituladoDAO.java               # Acceso a datos
├── AnálisisEstadístico.java       # Análisis de datos
├── MainApplication.java            # Interfaz GUI
├── README.md                       # Este archivo
└── target/
    └── tss-analyzer.jar           # JAR ejecutable
```

---

## 🎮 Uso de la Aplicación

### 📋 Pestaña 1: Inicio
- Información general del sistema
- Bienvenida y descripción

### 📝 Pestaña 2: Encuestas
- **Encuesta Titulados**: Recopilar datos de profesionales egresados
- **Encuesta Empleadores**: Información de demanda laboral

### 📈 Pestaña 3: Análisis
- **Estadísticas Descriptivas**: Media, mediana, desviación estándar
- **Prueba Chi-Cuadrado**: Relación entre variables categóricas
- **Análisis de Correlación**: Relación entre variables cuantitativas

### 📉 Pestaña 4: Gráficos
- Visualización de distribuciones
- Análisis bivariados gráficos
- Exportación de imágenes

### 📄 Pestaña 5: Reportes
- Exportar a Excel
- Generar PDFs con análisis completos

### ⚙️ Pestaña 6: Configuración
- Probar conexión a BD
- Reiniciar base de datos
- Preferencias de idioma

---

## 📊 Análisis Disponibles

### Análisis Univariado (Descriptivo)
```
Variables: Año de egreso, Situación laboral, Área de interés, etc.

Resultados:
- Frecuencias (absolutas y relativas)
- Media, Mediana, Moda
- Desviación estándar, Varianza
- Rango, Percentiles (Q1, Q3)
- Histogramas y distribuciones
```

### Análisis Bivariado (Inferencial)
```
Cruces de Variables:
- Situación laboral × Año egreso
- Área de interés × Institución posgrado
- Satisfacción formación × Tipo posgrado
- Empleabilidad × Antiguedad profesional

Pruebas:
- Chi-cuadrado (χ²): independencia
- Correlación de Pearson: cuantitativas
- Tablas de contingencia
```

---

## 📖 Manual de Análisis

### 1. Estadísticas Descriptivas
**Menú:** Herramientas → Estadísticas Descriptivas

Genera resumen de variables cuantitativas:
- **Media**: Promedio aritmético
- **Mediana**: Valor central
- **Desv. Est.**: Dispersión de datos
- **Percentiles**: Distribución acumulada

### 2. Prueba Chi-Cuadrado
**Menú:** Herramientas → Prueba Chi-Cuadrado

Evalúa independencia entre variables categóricas:
- H₀: Las variables son independientes
- H₁: Las variables están asociadas
- **Resultado**: χ², p-valor, significancia

### 3. Análisis de Correlación
Calcula relación lineal entre variables cuantitativas:
- **r = 1**: Correlación perfecta positiva
- **r = 0**: Sin correlación
- **r = -1**: Correlación perfecta negativa

---

## 🗄️ Base de Datos

### Tablas Principales

**titulados**
- Datos demográficos (edad, género, año egreso)
- Formación continua (posgrados)
- Situación laboral (empleo, emprendimiento)
- Retroalimentación sobre carrera

**empleadores**
- Información empresa (tamaño, sector, tipo)
- Demanda laboral (nivel formación, competencias)
- Opiniones sobre perfil profesional

**analisis_resultados**
- Almacena resultados de análisis
- Facilita generación de reportes

---

## 🔧 Desarrollo y Extensiones

### Agregar Nueva Variable de Análisis
1. Editar esquema SQL (`schema_tss.sql`)
2. Actualizar clase modelo (`Titulado.java` o `Empleador.java`)
3. Actualizar DAO (`TituladoDAO.java`)
4. Agregar campo en GUI de encuesta

### Crear Nuevo Tipo de Gráfico
1. Crear clase que extienda `JFreeChart`
2. Implementar en `crearPanelGraficos()`
3. Conectar a datos desde DAO

### Agregar Nuevas Pruebas Estadísticas
1. Agregar método en `AnálisisEstadístico.java`
2. Crear botón en pestaña "Análisis"
3. Mostrar resultados en diálogo o panel

---

## 🐛 Troubleshooting

| Problema | Solución |
|----------|----------|
| "No se puede encontrar MainApplication" | Verificar ruta correcta de clases |
| Error de conexión a BD | Ejecutar `DatabaseConnection.testConnection()` |
| Faltan dependencias Maven | Ejecutar `mvn clean install` |
| Interfaz lenta | Aumentar heap memory: `java -Xmx1024m -jar tss-analyzer.jar` |

---

## 📝 Notas Importantes

⚠️ **Base de Datos**
- Primera ejecución crea automáticamente esquema
- Datos se guardan en `tss_mercado.db` en directorio actual

⚠️ **Exportación de Reportes**
- Requiere permisos de escritura
- Excel y PDF se guardan en `reportes/`

⚠️ **Datos Sensibles**
- Sistema no almacena datos personales identificables
- Garantiza confidencialidad y anonimato

---

## 👥 Autor y Contacto

**Proyecto:** Análisis de Mercado - Ingeniería en Sistemas  
**Universidad:** Universidad Mayor de San Simón  
**Ubicación:** Cochabamba, Bolivia  
**Año:** 2026  
**Versión:** 1.0.0  

---

## 📄 Licencia

Uso exclusivo para fines académicos e institucionales en UMSS.

---

**¡Gracias por usar el Sistema de Análisis de Mercado!**
