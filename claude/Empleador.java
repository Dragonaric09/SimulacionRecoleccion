package bo.umss.fcyt.tss.modelo;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Modelo de datos para Empleadores del sector tecnológico
 * Representa la información recopilada en la encuesta a empleadores
 */
public class Empleador {
    private Integer idEmpleador;
    private String emailContacto;
    private String nombreEmpresa;
    private String tipoOrganizacion; // PUBLICO/PRIVADO
    private String tamañoOrganizacion; // GRANDE, MEDIANA, PEQUEÑA, MICRO
    private String rubroSector; // Desarrollo SW, Telecomunicaciones, etc.
    
    // Empleabilidad
    private Boolean contratacionUltimos5Años;
    private String posibilidadContratacionFutura; // ALTA, DEPENDIENTE, NO_PREVISTA, NO_REQUIERE
    private String nivelFormacionDemandado; // Licenciatura, Diplomado, Maestría, Doctorado, etc.
    
    // Medios de Convocatoria (Multiple)
    private List<String> mediosConvocatoria = new ArrayList<>();
    
    // Cargos Desempeñados (Multiple)
    private List<String> cargosDesempeñados = new ArrayList<>();
    
    // Nuevas Áreas y Tecnologías
    private String areasConocimientoEmergentes;
    private String herramientasTecnologicas;
    private String competenciasFundamentales;
    
    // Opiniones Likert (1=Totalmente desacuerdo, 4=Totalmente acuerdo)
    private Integer opinionConfianzaFormadora;
    private Integer opinionTituloConsistente;
    private Integer opinionConsultaRegularmente;
    private Integer opinionConocePerfil;
    private Integer opinionPerfilCoherente;
    private Integer opinionDesempeñoDestacado;
    private Integer opinionIncorporaNecesidades;
    private Integer opinionCompetenciasLaborales;
    private Integer opinionValoresActitudes;
    private Integer opinionParticipacionRetroalimentacion;
    
    // Metadatos
    private LocalDateTime fechaRespuesta;
    private Boolean completado;
    
    // Constructores
    public Empleador() {
        this.fechaRespuesta = LocalDateTime.now();
        this.completado = true;
    }
    
    public Empleador(String nombreEmpresa, String tipoOrganizacion, String tamañoOrganizacion, String rubroSector) {
        this.nombreEmpresa = nombreEmpresa;
        this.tipoOrganizacion = tipoOrganizacion;
        this.tamañoOrganizacion = tamañoOrganizacion;
        this.rubroSector = rubroSector;
        this.fechaRespuesta = LocalDateTime.now();
        this.completado = true;
    }
    
    // Getters y Setters
    public Integer getIdEmpleador() { return idEmpleador; }
    public void setIdEmpleador(Integer idEmpleador) { this.idEmpleador = idEmpleador; }
    
    public String getEmailContacto() { return emailContacto; }
    public void setEmailContacto(String emailContacto) { this.emailContacto = emailContacto; }
    
    public String getNombreEmpresa() { return nombreEmpresa; }
    public void setNombreEmpresa(String nombreEmpresa) { this.nombreEmpresa = nombreEmpresa; }
    
    public String getTipoOrganizacion() { return tipoOrganizacion; }
    public void setTipoOrganizacion(String tipoOrganizacion) { this.tipoOrganizacion = tipoOrganizacion; }
    
    public String getTamañoOrganizacion() { return tamañoOrganizacion; }
    public void setTamañoOrganizacion(String tamañoOrganizacion) { this.tamañoOrganizacion = tamañoOrganizacion; }
    
    public String getRubroSector() { return rubroSector; }
    public void setRubroSector(String rubroSector) { this.rubroSector = rubroSector; }
    
    public Boolean getContratacionUltimos5Años() { return contratacionUltimos5Años; }
    public void setContratacionUltimos5Años(Boolean contratacionUltimos5Años) { this.contratacionUltimos5Años = contratacionUltimos5Años; }
    
    public String getPosibilidadContratacionFutura() { return posibilidadContratacionFutura; }
    public void setPosibilidadContratacionFutura(String posibilidadContratacionFutura) { this.posibilidadContratacionFutura = posibilidadContratacionFutura; }
    
    public String getNivelFormacionDemandado() { return nivelFormacionDemandado; }
    public void setNivelFormacionDemandado(String nivelFormacionDemandado) { this.nivelFormacionDemandado = nivelFormacionDemandado; }
    
    public List<String> getMediosConvocatoria() { return mediosConvocatoria; }
    public void setMediosConvocatoria(List<String> mediosConvocatoria) { this.mediosConvocatoria = mediosConvocatoria; }
    public void addMedioConvocatoria(String medio) { this.mediosConvocatoria.add(medio); }
    
    public List<String> getCargosDesempeñados() { return cargosDesempeñados; }
    public void setCargosDesempeñados(List<String> cargosDesempeñados) { this.cargosDesempeñados = cargosDesempeñados; }
    public void addCargoDesempeñado(String cargo) { this.cargosDesempeñados.add(cargo); }
    
    public String getAreasConocimientoEmergentes() { return areasConocimientoEmergentes; }
    public void setAreasConocimientoEmergentes(String areasConocimientoEmergentes) { this.areasConocimientoEmergentes = areasConocimientoEmergentes; }
    
    public String getHerramientasTecnologicas() { return herramientasTecnologicas; }
    public void setHerramientasTecnologicas(String herramientasTecnologicas) { this.herramientasTecnologicas = herramientasTecnologicas; }
    
    public String getCompetenciasFundamentales() { return competenciasFundamentales; }
    public void setCompetenciasFundamentales(String competenciasFundamentales) { this.competenciasFundamentales = competenciasFundamentales; }
    
    public Integer getOpinionConfianzaFormadora() { return opinionConfianzaFormadora; }
    public void setOpinionConfianzaFormadora(Integer opinionConfianzaFormadora) { this.opinionConfianzaFormadora = opinionConfianzaFormadora; }
    
    public Integer getOpinionTituloConsistente() { return opinionTituloConsistente; }
    public void setOpinionTituloConsistente(Integer opinionTituloConsistente) { this.opinionTituloConsistente = opinionTituloConsistente; }
    
    public Integer getOpinionConsultaRegularmente() { return opinionConsultaRegularmente; }
    public void setOpinionConsultaRegularmente(Integer opinionConsultaRegularmente) { this.opinionConsultaRegularmente = opinionConsultaRegularmente; }
    
    public Integer getOpinionConocePerfil() { return opinionConocePerfil; }
    public void setOpinionConocePerfil(Integer opinionConocePerfil) { this.opinionConocePerfil = opinionConocePerfil; }
    
    public Integer getOpinionPerfilCoherente() { return opinionPerfilCoherente; }
    public void setOpinionPerfilCoherente(Integer opinionPerfilCoherente) { this.opinionPerfilCoherente = opinionPerfilCoherente; }
    
    public Integer getOpinionDesempeñoDestacado() { return opinionDesempeñoDestacado; }
    public void setOpinionDesempeñoDestacado(Integer opinionDesempeñoDestacado) { this.opinionDesempeñoDestacado = opinionDesempeñoDestacado; }
    
    public Integer getOpinionIncorporaNecesidades() { return opinionIncorporaNecesidades; }
    public void setOpinionIncorporaNecesidades(Integer opinionIncorporaNecesidades) { this.opinionIncorporaNecesidades = opinionIncorporaNecesidades; }
    
    public Integer getOpinionCompetenciasLaborales() { return opinionCompetenciasLaborales; }
    public void setOpinionCompetenciasLaborales(Integer opinionCompetenciasLaborales) { this.opinionCompetenciasLaborales = opinionCompetenciasLaborales; }
    
    public Integer getOpinionValoresActitudes() { return opinionValoresActitudes; }
    public void setOpinionValoresActitudes(Integer opinionValoresActitudes) { this.opinionValoresActitudes = opinionValoresActitudes; }
    
    public Integer getOpinionParticipacionRetroalimentacion() { return opinionParticipacionRetroalimentacion; }
    public void setOpinionParticipacionRetroalimentacion(Integer opinionParticipacionRetroalimentacion) { this.opinionParticipacionRetroalimentacion = opinionParticipacionRetroalimentacion; }
    
    public LocalDateTime getFechaRespuesta() { return fechaRespuesta; }
    public void setFechaRespuesta(LocalDateTime fechaRespuesta) { this.fechaRespuesta = fechaRespuesta; }
    
    public Boolean getCompletado() { return completado; }
    public void setCompletado(Boolean completado) { this.completado = completado; }
    
    /**
     * Calcula el promedio de opiniones Likert
     */
    public Double promedioOpiniones() {
        List<Integer> opiniones = new ArrayList<>();
        if (opinionConfianzaFormadora != null) opiniones.add(opinionConfianzaFormadora);
        if (opinionTituloConsistente != null) opiniones.add(opinionTituloConsistente);
        if (opinionConsultaRegularmente != null) opiniones.add(opinionConsultaRegularmente);
        if (opinionConocePerfil != null) opiniones.add(opinionConocePerfil);
        if (opinionPerfilCoherente != null) opiniones.add(opinionPerfilCoherente);
        if (opinionDesempeñoDestacado != null) opiniones.add(opinionDesempeñoDestacado);
        if (opinionIncorporaNecesidades != null) opiniones.add(opinionIncorporaNecesidades);
        if (opinionCompetenciasLaborales != null) opiniones.add(opinionCompetenciasLaborales);
        if (opinionValoresActitudes != null) opiniones.add(opinionValoresActitudes);
        if (opinionParticipacionRetroalimentacion != null) opiniones.add(opinionParticipacionRetroalimentacion);
        
        if (opiniones.isEmpty()) return 0.0;
        return opiniones.stream().mapToInt(Integer::intValue).average().orElse(0.0);
    }
    
    @Override
    public String toString() {
        return "Empleador{" +
                "id=" + idEmpleador +
                ", empresa='" + nombreEmpresa + '\'' +
                ", tipo='" + tipoOrganizacion + '\'' +
                ", tamaño='" + tamañoOrganizacion + '\'' +
                ", sector='" + rubroSector + '\'' +
                ", contratación_últimos_5años=" + contratacionUltimos5Años +
                '}';
    }
}
