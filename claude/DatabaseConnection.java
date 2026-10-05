package bo.umss.fcyt.tss.db;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.sql.*;

/**
 * Gestiona la conexión a la base de datos SQLite
 * Patrón Singleton para garantizar una única conexión
 */
public class DatabaseConnection {
    private static final Logger logger = LoggerFactory.getLogger(DatabaseConnection.class);
    private static final String DB_URL = "jdbc:sqlite:tss_mercado.db";
    private static final String SCHEMA_SQL = "schema_tss.sql";
    
    private static DatabaseConnection instance;
    private Connection connection;
    
    private DatabaseConnection() {
        try {
            Class.forName("org.sqlite.JDBC");
            this.connection = DriverManager.getConnection(DB_URL);
            this.connection.setAutoCommit(true);
            logger.info("✅ Conexión a SQLite establecida: " + DB_URL);
            
            // Inicializar esquema si es necesario
            initializeSchema();
        } catch (ClassNotFoundException | SQLException e) {
            logger.error("❌ Error al conectar a la base de datos", e);
            throw new RuntimeException("No se pudo establecer conexión a la BD", e);
        }
    }
    
    /**
     * Obtiene la instancia singleton de la conexión
     */
    public static synchronized DatabaseConnection getInstance() {
        if (instance == null) {
            instance = new DatabaseConnection();
        }
        return instance;
    }
    
    /**
     * Retorna la conexión activa
     */
    public Connection getConnection() {
        try {
            if (connection == null || connection.isClosed()) {
                connection = DriverManager.getConnection(DB_URL);
            }
        } catch (SQLException e) {
            logger.error("Error al obtener conexión", e);
        }
        return connection;
    }
    
    /**
     * Inicializa el esquema de la base de datos
     */
    private void initializeSchema() {
        try (Statement stmt = connection.createStatement()) {
            // Verificar si la tabla ya existe
            DatabaseMetaData dbm = connection.getMetaData();
            ResultSet tables = dbm.getTables(null, null, "titulados", null);
            
            if (!tables.next()) {
                logger.info("Creando esquema de base de datos...");
                
                // Crear tabla de titulados
                stmt.execute("""
                    CREATE TABLE IF NOT EXISTS titulados (
                        id_titulado INTEGER PRIMARY KEY AUTOINCREMENT,
                        edad TEXT NOT NULL,
                        genero TEXT NOT NULL,
                        año_egreso INTEGER NOT NULL,
                        realizo_postgrado TEXT NOT NULL,
                        tipo_postgrado TEXT,
                        nivel_postgrado TEXT,
                        institucion_postgrado TEXT,
                        financiamiento_postgrado TEXT,
                        nombre_programa TEXT,
                        interes_postgrado_futuro TEXT NOT NULL,
                        area_interes TEXT,
                        institucion_preferida TEXT,
                        opinion_postgrado_fcyt INTEGER,
                        existe_programas_afines INTEGER,
                        años_vida_profesional INTEGER,
                        años_desempleado INTEGER,
                        situacion_laboral TEXT NOT NULL,
                        origen_emprendimiento TEXT,
                        tipo_entregable TEXT,
                        financiamiento_externo TEXT,
                        satisfaccion_negocio INTEGER,
                        importancia_formacion_negocio INTEGER,
                        primer_empleo TEXT NOT NULL,
                        tiempo_primer_empleo TEXT,
                        cantidad_empleos INTEGER,
                        satisfaccion_formacion INTEGER,
                        concordancia_formacion_mercado INTEGER,
                        util_practicas_teoricas TEXT,
                        util_pasantias TEXT,
                        util_horarios TEXT,
                        util_habilidades_analiticas TEXT,
                        util_equipos_multidisciplinarios TEXT,
                        util_herramientas_software TEXT,
                        mejora_integracion_teoria TEXT,
                        mejora_relacion_empresas TEXT,
                        mejora_horarios TEXT,
                        mejora_actualizacion_plan TEXT,
                        mejora_actividades_extracurriculares TEXT,
                        mejora_especializaciones TEXT,
                        asignaturas_utiles TEXT,
                        asignaturas_no_utiles TEXT,
                        interes_red_contactos TEXT NOT NULL,
                        email_contacto TEXT,
                        telefono_contacto TEXT,
                        whatsapp_contacto TEXT,
                        linkedin_url TEXT,
                        fecha_respuesta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        completado INTEGER DEFAULT 1
                    )
                """);
                
                // Crear tabla de empleadores
                stmt.execute("""
                    CREATE TABLE IF NOT EXISTS empleadores (
                        id_empleador INTEGER PRIMARY KEY AUTOINCREMENT,
                        email_contacto TEXT NOT NULL,
                        nombre_empresa TEXT NOT NULL,
                        tipo_organizacion TEXT NOT NULL,
                        tamaño_organizacion TEXT NOT NULL,
                        rubro_sector TEXT NOT NULL,
                        contratacion_ultimos_5años TEXT NOT NULL,
                        posibilidad_contratacion_futura TEXT,
                        nivel_formacion_demandado TEXT,
                        convoca_medios_escritos TEXT,
                        convoca_internet TEXT,
                        convoca_competitiva TEXT,
                        convoca_personal TEXT,
                        convoca_recomendaciones TEXT,
                        convoca_otros TEXT,
                        cargo_apoyo TEXT,
                        cargo_tecnico TEXT,
                        cargo_analista TEXT,
                        cargo_especialista TEXT,
                        cargo_supervisor TEXT,
                        cargo_jefatura TEXT,
                        cargo_consultor TEXT,
                        cargo_otro TEXT,
                        areas_conocimiento_emergentes TEXT,
                        herramientas_tecnologicas TEXT,
                        competencias_fundamentales TEXT,
                        opinion_confianza_formadora INTEGER,
                        opinion_titulo_consistente INTEGER,
                        opinion_consulta_regularmente INTEGER,
                        opinion_conoce_perfil INTEGER,
                        opinion_perfil_coherente INTEGER,
                        opinion_desempeño_destacado INTEGER,
                        opinion_incorpora_necesidades INTEGER,
                        opinion_competencias_laborales INTEGER,
                        opinion_valores_actitudes INTEGER,
                        opinion_participacion_retroalimentacion INTEGER,
                        fecha_respuesta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        completado INTEGER DEFAULT 1
                    )
                """);
                
                // Crear tabla de análisis
                stmt.execute("""
                    CREATE TABLE IF NOT EXISTS analisis_resultados (
                        id_analisis INTEGER PRIMARY KEY AUTOINCREMENT,
                        tipo_analisis TEXT NOT NULL,
                        variable1 TEXT,
                        variable2 TEXT,
                        resultado_json TEXT,
                        fecha_generacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """);
                
                // Crear índices
                stmt.execute("CREATE INDEX IF NOT EXISTS idx_titulados_año_egreso ON titulados(año_egreso)");
                stmt.execute("CREATE INDEX IF NOT EXISTS idx_titulados_situacion_laboral ON titulados(situacion_laboral)");
                stmt.execute("CREATE INDEX IF NOT EXISTS idx_titulados_area_interes ON titulados(area_interes)");
                stmt.execute("CREATE INDEX IF NOT EXISTS idx_empleadores_sector ON empleadores(rubro_sector)");
                stmt.execute("CREATE INDEX IF NOT EXISTS idx_empleadores_tamaño ON empleadores(tamaño_organizacion)");
                
                logger.info("✅ Esquema de base de datos creado exitosamente");
            }
        } catch (SQLException e) {
            logger.error("Error al inicializar esquema", e);
        }
    }
    
    /**
     * Cierra la conexión
     */
    public void closeConnection() {
        try {
            if (connection != null && !connection.isClosed()) {
                connection.close();
                logger.info("Conexión a base de datos cerrada");
            }
        } catch (SQLException e) {
            logger.error("Error al cerrar conexión", e);
        }
    }
    
    /**
     * Ejecuta una prueba de conexión
     */
    public static void testConnection() {
        try {
            DatabaseConnection db = DatabaseConnection.getInstance();
            Connection conn = db.getConnection();
            
            if (conn != null && !conn.isClosed()) {
                System.out.println("✅ Conexión a base de datos: OK");
                
                // Contar registros
                Statement stmt = conn.createStatement();
                ResultSet rs = stmt.executeQuery("SELECT COUNT(*) as count FROM titulados");
                if (rs.next()) {
                    System.out.println("   Titulados en BD: " + rs.getInt("count"));
                }
                rs.close();
                stmt.close();
            } else {
                System.out.println("❌ Error: No se pudo establecer conexión");
            }
        } catch (SQLException e) {
            System.out.println("❌ Error de conexión: " + e.getMessage());
        }
    }
}
