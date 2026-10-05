package bo.umss.fcyt.tss.modelo;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Modelo de datos para Titulados de Ingeniería en Sistemas
 * Representa la información recopilada en la encuesta de opinión
 */
public class Titulado {
    private Integer idTitulado;
    private String edad;
    private String genero;
    private Integer añoEgreso;
    
    // Formación Continua
    private Boolean realizoPosgrado;
    private String tipoPosgrado; // DIPLOMADO, ESPECIALIDAD, MAESTRIA, DOCTORADO, POS_DOCTORADO
    private String institucionPosgrado;
    private String financiamientoPosgrado; // RECURSOS_PROPIOS, BECA_TOTAL, BECA_PARCIAL
    private String nombrePrograma;
    
    // Interés en Posgrados Futuros
    private Boolean interesPosgradoFuturo;
    private String areaInteres; // IA, ROBOTICA, SOFTWARE, BD, REDES_SEGURIDAD
    private String institucionPreferida;
    private Integer opinionPosgradoFCyT; // Likert 1-4
    private Integer existeProgramasAfines; // Likert 1-4
    
    // Vida Profesional
    private Integer añosVidaProfesional;
    private Integer añosDesempleado;
    private String situacionLaboral; // TRABAJA, NO_TRABAJA, EMPRENDIMIENTO
    
    // Si tiene emprendimiento
    private String origenEmprendimiento; // IDEA_PROPIA, IDEA_CONJUNTA, STARTUP, SPINOFF, OTRO
    private String tipoEntregable; // PRODUCTO, SERVICIO, AMBOS
    private String financiamientoExterno; // SI_PRESTAMOS, SI_INVERSORES, NO_PROPIO
    private Integer satisfaccionNegocio; // Likert 1-3
    private Integer importanciaFormacionNegocio; // Likert 1-4
    
    // Empleo Actual
    private Boolean primerEmpleo;
    private String tiempoPrimerEmpleo; // YA_TRABAJABA, MENOS_1MES, 1_4MESES, etc.
    private Integer cantidadEmpleos;
    private Integer satisfaccionFormacion; // Likert 1-4
    private Integer concordanciaFormacionMercado; // Likert 1-4
    
    // Aspectos Útiles
    private List<String> aspectosUtiles = new ArrayList<>();
    
    // Aspectos a Mejorar
    private List<String> aspectosMejora = new ArrayList<>();
    
    // Asignaturas
    private List<String> asignaturasUtiles = new ArrayList<>();
    private List<String> asignaturasNoUtiles = new ArrayList<>();
    
    // Contacto
    private String emailContacto;
    private String telefonoContacto;
    private String whatsappContacto;
    private String linkedinUrl;
    private Boolean interesRedContactos;
    
    // Metadatos
    private LocalDateTime fechaRespuesta;
    private Boolean completado;
    
    // Constructores
    public Titulado() {
    }
    
    public Titulado(String edad, String genero, Integer añoEgreso) {
        this.edad = edad;
        this.genero = genero;
        this.añoEgreso = añoEgreso;
        this.fechaRespuesta = LocalDateTime.now();
        this.completado = true;
    }
    
    // Getters y Setters
    public Integer getIdTitulado() { return idTitulado; }
    public void setIdTitulado(Integer idTitulado) { this.idTitulado = idTitulado; }
    
    public String getEdad() { return edad; }
    public void setEdad(String edad) { this.edad = edad; }
    
    public String getGenero() { return genero; }
    public void setGenero(String genero) { this.genero = genero; }
    
    public Integer getAñoEgreso() { return añoEgreso; }
    public void setAñoEgreso(Integer añoEgreso) { this.añoEgreso = añoEgreso; }
    
    public Boolean getRealizoPosgrado() { return realizoPosgrado; }
    public void setRealizoPosgrado(Boolean realizoPosgrado) { this.realizoPosgrado = realizoPosgrado; }
    
    public String getTipoPosgrado() { return tipoPosgrado; }
    public void setTipoPosgrado(String tipoPosgrado) { this.tipoPosgrado = tipoPosgrado; }
    
    public String getInstitucionPosgrado() { return institucionPosgrado; }
    public void setInstitucionPosgrado(String institucionPosgrado) { this.institucionPosgrado = institucionPosgrado; }
    
    public String getFinanciamientoPosgrado() { return financiamientoPosgrado; }
    public void setFinanciamientoPosgrado(String financiamientoPosgrado) { this.financiamientoPosgrado = financiamientoPosgrado; }
    
    public String getNombrePrograma() { return nombrePrograma; }
    public void setNombrePrograma(String nombrePrograma) { this.nombrePrograma = nombrePrograma; }
    
    public Boolean getInteresPosgradoFuturo() { return interesPosgradoFuturo; }
    public void setInteresPosgradoFuturo(Boolean interesPosgradoFuturo) { this.interesPosgradoFuturo = interesPosgradoFuturo; }
    
    public String getAreaInteres() { return areaInteres; }
    public void setAreaInteres(String areaInteres) { this.areaInteres = areaInteres; }
    
    public String getInstitucionPreferida() { return institucionPreferida; }
    public void setInstitucionPreferida(String institucionPreferida) { this.institucionPreferida = institucionPreferida; }
    
    public Integer getOpinionPosgradoFCyT() { return opinionPosgradoFCyT; }
    public void setOpinionPosgradoFCyT(Integer opinionPosgradoFCyT) { this.opinionPosgradoFCyT = opinionPosgradoFCyT; }
    
    public Integer getExisteProgramasAfines() { return existeProgramasAfines; }
    public void setExisteProgramasAfines(Integer existeProgramasAfines) { this.existeProgramasAfines = existeProgramasAfines; }
    
    public Integer getAñosVidaProfesional() { return añosVidaProfesional; }
    public void setAñosVidaProfesional(Integer añosVidaProfesional) { this.añosVidaProfesional = añosVidaProfesional; }
    
    public Integer getAñosDesempleado() { return añosDesempleado; }
    public void setAñosDesempleado(Integer añosDesempleado) { this.añosDesempleado = añosDesempleado; }
    
    public String getSituacionLaboral() { return situacionLaboral; }
    public void setSituacionLaboral(String situacionLaboral) { this.situacionLaboral = situacionLaboral; }
    
    public String getOrigenEmprendimiento() { return origenEmprendimiento; }
    public void setOrigenEmprendimiento(String origenEmprendimiento) { this.origenEmprendimiento = origenEmprendimiento; }
    
    public String getTipoEntregable() { return tipoEntregable; }
    public void setTipoEntregable(String tipoEntregable) { this.tipoEntregable = tipoEntregable; }
    
    public String getFinanciamientoExterno() { return financiamientoExterno; }
    public void setFinanciamientoExterno(String financiamientoExterno) { this.financiamientoExterno = financiamientoExterno; }
    
    public Integer getSatisfaccionNegocio() { return satisfaccionNegocio; }
    public void setSatisfaccionNegocio(Integer satisfaccionNegocio) { this.satisfaccionNegocio = satisfaccionNegocio; }
    
    public Integer getImportanciaFormacionNegocio() { return importanciaFormacionNegocio; }
    public void setImportanciaFormacionNegocio(Integer importanciaFormacionNegocio) { this.importanciaFormacionNegocio = importanciaFormacionNegocio; }
    
    public Boolean getPrimerEmpleo() { return primerEmpleo; }
    public void setPrimerEmpleo(Boolean primerEmpleo) { this.primerEmpleo = primerEmpleo; }
    
    public String getTiempoPrimerEmpleo() { return tiempoPrimerEmpleo; }
    public void setTiempoPrimerEmpleo(String tiempoPrimerEmpleo) { this.tiempoPrimerEmpleo = tiempoPrimerEmpleo; }
    
    public Integer getCantidadEmpleos() { return cantidadEmpleos; }
    public void setCantidadEmpleos(Integer cantidadEmpleos) { this.cantidadEmpleos = cantidadEmpleos; }
    
    public Integer getSatisfaccionFormacion() { return satisfaccionFormacion; }
    public void setSatisfaccionFormacion(Integer satisfaccionFormacion) { this.satisfaccionFormacion = satisfaccionFormacion; }
    
    public Integer getConcordanciaFormacionMercado() { return concordanciaFormacionMercado; }
    public void setConcordanciaFormacionMercado(Integer concordanciaFormacionMercado) { this.concordanciaFormacionMercado = concordanciaFormacionMercado; }
    
    public List<String> getAspectosUtiles() { return aspectosUtiles; }
    public void setAspectosUtiles(List<String> aspectosUtiles) { this.aspectosUtiles = aspectosUtiles; }
    public void addAspectoUtil(String aspecto) { this.aspectosUtiles.add(aspecto); }
    
    public List<String> getAspectosMejora() { return aspectosMejora; }
    public void setAspectosMejora(List<String> aspectosMejora) { this.aspectosMejora = aspectosMejora; }
    public void addAspectoMejora(String aspecto) { this.aspectosMejora.add(aspecto); }
    
    public List<String> getAsignaturasUtiles() { return asignaturasUtiles; }
    public void setAsignaturasUtiles(List<String> asignaturasUtiles) { this.asignaturasUtiles = asignaturasUtiles; }
    
    public List<String> getAsignaturasNoUtiles() { return asignaturasNoUtiles; }
    public void setAsignaturasNoUtiles(List<String> asignaturasNoUtiles) { this.asignaturasNoUtiles = asignaturasNoUtiles; }
    
    public String getEmailContacto() { return emailContacto; }
    public void setEmailContacto(String emailContacto) { this.emailContacto = emailContacto; }
    
    public String getTelefonoContacto() { return telefonoContacto; }
    public void setTelefonoContacto(String telefonoContacto) { this.telefonoContacto = telefonoContacto; }
    
    public String getWhatsappContacto() { return whatsappContacto; }
    public void setWhatsappContacto(String whatsappContacto) { this.whatsappContacto = whatsappContacto; }
    
    public String getLinkedinUrl() { return linkedinUrl; }
    public void setLinkedinUrl(String linkedinUrl) { this.linkedinUrl = linkedinUrl; }
    
    public Boolean getInteresRedContactos() { return interesRedContactos; }
    public void setInteresRedContactos(Boolean interesRedContactos) { this.interesRedContactos = interesRedContactos; }
    
    public LocalDateTime getFechaRespuesta() { return fechaRespuesta; }
    public void setFechaRespuesta(LocalDateTime fechaRespuesta) { this.fechaRespuesta = fechaRespuesta; }
    
    public Boolean getCompletado() { return completado; }
    public void setCompletado(Boolean completado) { this.completado = completado; }
    
    /**
     * Calcula antigüedad en años (desde año de egreso)
     */
    public Integer getAntiguedadEnAños() {
        if (this.añoEgreso == null) return null;
        return 2026 - this.añoEgreso; // El sistema está en 2026
    }
    
    /**
     * Categoriza antigüedad en profesional junior, consolidado o senior
     */
    public String categorizarExperiencia() {
        Integer antiguedad = getAntiguedadEnAños();
        if (antiguedad == null) return "Desconocida";
        if (antiguedad <= 3) return "Junior";
        if (antiguedad <= 8) return "Consolidado";
        return "Senior";
    }
    
    @Override
    public String toString() {
        return "Titulado{" +
                "id=" + idTitulado +
                ", género='" + genero + '\'' +
                ", año_egreso=" + añoEgreso +
                ", antigüedad=" + getAntiguedadEnAños() + " años" +
                ", situación_laboral='" + situacionLaboral + '\'' +
                ", área_interés='" + areaInteres + '\'' +
                '}';
    }
}
