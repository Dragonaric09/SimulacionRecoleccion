package bo.umss.fcyt.tss.dao;

import bo.umss.fcyt.tss.modelo.Titulado;
import bo.umss.fcyt.tss.db.DatabaseConnection;
import com.google.gson.Gson;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.sql.*;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Data Access Object para la tabla 'titulados'
 * Gestiona todas las operaciones de lectura/escritura de datos de titulados
 */
public class TituladoDAO {
    private static final Logger logger = LoggerFactory.getLogger(TituladoDAO.class);
    private final DatabaseConnection dbConnection;
    private final Gson gson = new Gson();
    
    public TituladoDAO() {
        this.dbConnection = DatabaseConnection.getInstance();
    }
    
    /**
     * Inserta un nuevo registro de titulado en la base de datos
     */
    public Integer insertarTitulado(Titulado titulado) {
        String sql = """
            INSERT INTO titulados (
                edad, genero, año_egreso, realizo_postgrado, tipo_postgrado, 
                institucion_postgrado, financiamiento_postgrado, nombre_programa,
                interes_postgrado_futuro, area_interes, institucion_preferida,
                opinion_postgrado_fcyt, existe_programas_afines,
                años_vida_profesional, años_desempleado, situacion_laboral,
                origen_emprendimiento, tipo_entregable, financiamiento_externo,
                satisfaccion_negocio, importancia_formacion_negocio,
                primer_empleo, tiempo_primer_empleo, cantidad_empleos,
                satisfaccion_formacion, concordancia_formacion_mercado,
                util_practicas_teoricas, util_pasantias, util_horarios,
                util_habilidades_analiticas, util_equipos_multidisciplinarios,
                util_herramientas_software, mejora_integracion_teoria,
                mejora_relacion_empresas, mejora_horarios, mejora_actualizacion_plan,
                mejora_actividades_extracurriculares, mejora_especializaciones,
                asignaturas_utiles, asignaturas_no_utiles,
                interes_red_contactos, email_contacto, telefono_contacto,
                whatsapp_contacto, linkedin_url
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 
                     ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 
                     ?, ?, ?, ?, ?)
        """;
        
        try (Connection conn = dbConnection.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            
            int idx = 1;
            pstmt.setString(idx++, titulado.getEdad());
            pstmt.setString(idx++, titulado.getGenero());
            pstmt.setInt(idx++, titulado.getAñoEgreso());
            pstmt.setString(idx++, titulado.getRealizoPosgrado() != null ? (titulado.getRealizoPosgrado() ? "SI" : "NO") : null);
            pstmt.setString(idx++, titulado.getTipoPosgrado());
            pstmt.setString(idx++, titulado.getInstitucionPosgrado());
            pstmt.setString(idx++, titulado.getFinanciamientoPosgrado());
            pstmt.setString(idx++, titulado.getNombrePrograma());
            pstmt.setString(idx++, titulado.getInteresPosgradoFuturo() != null ? (titulado.getInteresPosgradoFuturo() ? "SI" : "NO") : null);
            pstmt.setString(idx++, titulado.getAreaInteres());
            pstmt.setString(idx++, titulado.getInstitucionPreferida());
            pstmt.setObject(idx++, titulado.getOpinionPosgradoFCyT());
            pstmt.setObject(idx++, titulado.getExisteProgramasAfines());
            pstmt.setObject(idx++, titulado.getAñosVidaProfesional());
            pstmt.setObject(idx++, titulado.getAñosDesempleado());
            pstmt.setString(idx++, titulado.getSituacionLaboral());
            pstmt.setString(idx++, titulado.getOrigenEmprendimiento());
            pstmt.setString(idx++, titulado.getTipoEntregable());
            pstmt.setString(idx++, titulado.getFinanciamientoExterno());
            pstmt.setObject(idx++, titulado.getSatisfaccionNegocio());
            pstmt.setObject(idx++, titulado.getImportanciaFormacionNegocio());
            pstmt.setString(idx++, titulado.getPrimerEmpleo() != null ? (titulado.getPrimerEmpleo() ? "SI" : "NO") : null);
            pstmt.setString(idx++, titulado.getTiempoPrimerEmpleo());
            pstmt.setObject(idx++, titulado.getCantidadEmpleos());
            pstmt.setObject(idx++, titulado.getSatisfaccionFormacion());
            pstmt.setObject(idx++, titulado.getConcordanciaFormacionMercado());
            pstmt.setString(idx++, gson.toJson(titulado.getAspectosUtiles()));
            pstmt.setString(idx++, gson.toJson(titulado.getAspectosMejora()));
            pstmt.setString(idx++, gson.toJson(titulado.getAsignaturasUtiles()));
            pstmt.setString(idx++, gson.toJson(titulado.getAsignaturasNoUtiles()));
            pstmt.setString(idx++, titulado.getInteresRedContactos() != null ? (titulado.getInteresRedContactos() ? "SI" : "NO") : null);
            pstmt.setString(idx++, titulado.getEmailContacto());
            pstmt.setString(idx++, titulado.getTelefonoContacto());
            pstmt.setString(idx++, titulado.getWhatsappContacto());
            pstmt.setString(idx++, titulado.getLinkedinUrl());
            
            pstmt.executeUpdate();
            
            try (ResultSet generatedKeys = pstmt.getGeneratedKeys()) {
                if (generatedKeys.next()) {
                    Integer id = generatedKeys.getInt(1);
                    logger.info("✅ Titulado insertado con ID: " + id);
                    return id;
                }
            }
        } catch (SQLException e) {
            logger.error("Error al insertar titulado", e);
        }
        return null;
    }
    
    /**
     * Obtiene todos los titulados
     */
    public List<Titulado> obtenerTodos() {
        String sql = "SELECT * FROM titulados ORDER BY fecha_respuesta DESC";
        List<Titulado> titulados = new ArrayList<>();
        
        try (Connection conn = dbConnection.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {
            
            while (rs.next()) {
                titulados.add(mapearResultSet(rs));
            }
        } catch (SQLException e) {
            logger.error("Error al obtener titulados", e);
        }
        return titulados;
    }
    
    /**
     * Obtiene un titulado por ID
     */
    public Titulado obtenerPorId(Integer id) {
        String sql = "SELECT * FROM titulados WHERE id_titulado = ?";
        
        try (Connection conn = dbConnection.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            
            pstmt.setInt(1, id);
            
            try (ResultSet rs = pstmt.executeQuery()) {
                if (rs.next()) {
                    return mapearResultSet(rs);
                }
            }
        } catch (SQLException e) {
            logger.error("Error al obtener titulado por ID", e);
        }
        return null;
    }
    
    /**
     * Cuenta el total de titulados
     */
    public Integer contar() {
        String sql = "SELECT COUNT(*) as count FROM titulados WHERE completado = 1";
        
        try (Connection conn = dbConnection.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {
            
            if (rs.next()) {
                return rs.getInt("count");
            }
        } catch (SQLException e) {
            logger.error("Error al contar titulados", e);
        }
        return 0;
    }
    
    /**
     * Obtiene frecuencias de una variable (para análisis descriptivo)
     */
    public Map<String, Integer> obtenerFrecuencias(String columna) {
        String sql = "SELECT " + columna + ", COUNT(*) as frecuencia FROM titulados WHERE " + columna + " IS NOT NULL GROUP BY " + columna;
        Map<String, Integer> frecuencias = new LinkedHashMap<>();
        
        try (Connection conn = dbConnection.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {
            
            while (rs.next()) {
                String valor = rs.getString(columna);
                Integer frecuencia = rs.getInt("frecuencia");
                frecuencias.put(valor, frecuencia);
            }
        } catch (SQLException e) {
            logger.error("Error al obtener frecuencias", e);
        }
        return frecuencias;
    }
    
    /**
     * Obtiene estadísticas de una columna numérica
     */
    public Map<String, Double> obtenerEstadisticas(String columna) {
        String sql = "SELECT " +
                "AVG(" + columna + ") as promedio, " +
                "MIN(" + columna + ") as minimo, " +
                "MAX(" + columna + ") as maximo, " +
                "COUNT(" + columna + ") as cantidad " +
                "FROM titulados WHERE " + columna + " IS NOT NULL";
        
        Map<String, Double> estadisticas = new LinkedHashMap<>();
        
        try (Connection conn = dbConnection.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {
            
            if (rs.next()) {
                estadisticas.put("promedio", rs.getDouble("promedio"));
                estadisticas.put("minimo", rs.getDouble("minimo"));
                estadisticas.put("maximo", rs.getDouble("maximo"));
                estadisticas.put("cantidad", rs.getDouble("cantidad"));
            }
        } catch (SQLException e) {
            logger.error("Error al obtener estadísticas", e);
        }
        return estadisticas;
    }
    
    /**
     * Obtiene titulados por año de egreso (agrupación)
     */
    public Map<Integer, Integer> obtenerPorAñoEgreso() {
        String sql = "SELECT año_egreso, COUNT(*) as cantidad FROM titulados WHERE año_egreso IS NOT NULL GROUP BY año_egreso ORDER BY año_egreso DESC";
        Map<Integer, Integer> porAño = new LinkedHashMap<>();
        
        try (Connection conn = dbConnection.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {
            
            while (rs.next()) {
                porAño.put(rs.getInt("año_egreso"), rs.getInt("cantidad"));
            }
        } catch (SQLException e) {
            logger.error("Error al obtener por año", e);
        }
        return porAño;
    }
    
    /**
     * Mapea un ResultSet a un objeto Titulado
     */
    private Titulado mapearResultSet(ResultSet rs) throws SQLException {
        Titulado t = new Titulado();
        t.setIdTitulado(rs.getInt("id_titulado"));
        t.setEdad(rs.getString("edad"));
        t.setGenero(rs.getString("genero"));
        t.setAñoEgreso(rs.getInt("año_egreso"));
        t.setRealizoPosgrado("SI".equals(rs.getString("realizo_postgrado")));
        t.setTipoPosgrado(rs.getString("tipo_postgrado"));
        t.setInstitucionPosgrado(rs.getString("institucion_postgrado"));
        t.setFinanciamientoPosgrado(rs.getString("financiamiento_postgrado"));
        t.setNombrePrograma(rs.getString("nombre_programa"));
        t.setInteresPosgradoFuturo("SI".equals(rs.getString("interes_postgrado_futuro")));
        t.setAreaInteres(rs.getString("area_interes"));
        t.setInstitucionPreferida(rs.getString("institucion_preferida"));
        t.setOpinionPosgradoFCyT(rs.getInt("opinion_postgrado_fcyt"));
        t.setExisteProgramasAfines(rs.getInt("existe_programas_afines"));
        t.setAñosVidaProfesional(rs.getInt("años_vida_profesional"));
        t.setAñosDesempleado(rs.getInt("años_desempleado"));
        t.setSituacionLaboral(rs.getString("situacion_laboral"));
        t.setOrigenEmprendimiento(rs.getString("origen_emprendimiento"));
        t.setTipoEntregable(rs.getString("tipo_entregable"));
        t.setFinanciamientoExterno(rs.getString("financiamiento_externo"));
        t.setSatisfaccionNegocio(rs.getInt("satisfaccion_negocio"));
        t.setImportanciaFormacionNegocio(rs.getInt("importancia_formacion_negocio"));
        t.setPrimerEmpleo("SI".equals(rs.getString("primer_empleo")));
        t.setTiempoPrimerEmpleo(rs.getString("tiempo_primer_empleo"));
        t.setCantidadEmpleos(rs.getInt("cantidad_empleos"));
        t.setSatisfaccionFormacion(rs.getInt("satisfaccion_formacion"));
        t.setConcordanciaFormacionMercado(rs.getInt("concordancia_formacion_mercado"));
        t.setFechaRespuesta(rs.getTimestamp("fecha_respuesta") != null ? rs.getTimestamp("fecha_respuesta").toLocalDateTime() : null);
        return t;
    }
}
