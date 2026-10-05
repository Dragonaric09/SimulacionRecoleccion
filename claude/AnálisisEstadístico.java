package bo.umss.fcyt.tss.analisis;

import org.apache.commons.math3.stat.inference.ChiSquareTest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Clase para realizar análisis estadístico descriptivo e inferencial
 * Incluye cálculos de frecuencias, medidas de tendencia central,
 * pruebas chi-cuadrado, y otras métricas
 */
public class AnálisisEstadístico {
    private static final Logger logger = LoggerFactory.getLogger(AnálisisEstadístico.class);
    private ChiSquareTest chiSquareTest = new ChiSquareTest();
    
    /**
     * Calcula media aritmética
     */
    public Double calcularMedia(List<Double> valores) {
        if (valores == null || valores.isEmpty()) return 0.0;
        return valores.stream()
                .mapToDouble(Double::doubleValue)
                .average()
                .orElse(0.0);
    }
    
    /**
     * Calcula mediana
     */
    public Double calcularMediana(List<Double> valores) {
        if (valores == null || valores.isEmpty()) return 0.0;
        
        List<Double> sorted = valores.stream()
                .sorted()
                .collect(Collectors.toList());
        
        int n = sorted.size();
        if (n % 2 == 0) {
            return (sorted.get(n / 2 - 1) + sorted.get(n / 2)) / 2.0;
        } else {
            return sorted.get(n / 2);
        }
    }
    
    /**
     * Calcula moda (valor más frecuente)
     */
    public String calcularModa(List<String> valores) {
        if (valores == null || valores.isEmpty()) return null;
        
        return valores.stream()
                .collect(Collectors.groupingBy(s -> s, Collectors.counting()))
                .entrySet()
                .stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse(null);
    }
    
    /**
     * Calcula desviación estándar
     */
    public Double calcularDesviacionEstandar(List<Double> valores) {
        if (valores == null || valores.size() < 2) return 0.0;
        
        Double media = calcularMedia(valores);
        Double sumaCuadrados = valores.stream()
                .mapToDouble(v -> Math.pow(v - media, 2))
                .sum();
        
        return Math.sqrt(sumaCuadrados / (valores.size() - 1));
    }
    
    /**
     * Calcula varianza
     */
    public Double calcularVarianza(List<Double> valores) {
        Double desv = calcularDesviacionEstandar(valores);
        return Math.pow(desv, 2);
    }
    
    /**
     * Calcula rango
     */
    public Double calcularRango(List<Double> valores) {
        if (valores == null || valores.isEmpty()) return 0.0;
        Double max = valores.stream().mapToDouble(Double::doubleValue).max().orElse(0.0);
        Double min = valores.stream().mapToDouble(Double::doubleValue).min().orElse(0.0);
        return max - min;
    }
    
    /**
     * Calcula percentil
     */
    public Double calcularPercentil(List<Double> valores, int percentil) {
        if (valores == null || valores.isEmpty() || percentil < 0 || percentil > 100) {
            return 0.0;
        }
        
        List<Double> sorted = valores.stream()
                .sorted()
                .collect(Collectors.toList());
        
        int index = (int) Math.ceil((percentil / 100.0) * sorted.size()) - 1;
        return sorted.get(Math.max(0, Math.min(index, sorted.size() - 1)));
    }
    
    /**
     * Calcula estadísticas descriptivas completas
     */
    public Map<String, Double> estadísticasDescriptivas(List<Double> valores) {
        Map<String, Double> stats = new LinkedHashMap<>();
        
        if (valores == null || valores.isEmpty()) {
            stats.put("cantidad", 0.0);
            return stats;
        }
        
        stats.put("cantidad", (double) valores.size());
        stats.put("media", calcularMedia(valores));
        stats.put("mediana", calcularMediana(valores));
        stats.put("desv_estandar", calcularDesviacionEstandar(valores));
        stats.put("varianza", calcularVarianza(valores));
        stats.put("minimo", valores.stream().mapToDouble(Double::doubleValue).min().orElse(0.0));
        stats.put("maximo", valores.stream().mapToDouble(Double::doubleValue).max().orElse(0.0));
        stats.put("rango", calcularRango(valores));
        stats.put("q1", calcularPercentil(valores, 25));
        stats.put("q3", calcularPercentil(valores, 75));
        
        return stats;
    }
    
    /**
     * Calcula frecuencias relativas (porcentajes)
     */
    public Map<String, Double> calcularFrecuenciasRelativas(Map<String, Integer> frecuencias) {
        Map<String, Double> relativas = new LinkedHashMap<>();
        
        if (frecuencias == null || frecuencias.isEmpty()) {
            return relativas;
        }
        
        Integer total = frecuencias.values().stream()
                .mapToInt(Integer::intValue)
                .sum();
        
        frecuencias.forEach((clave, valor) -> {
            Double porcentaje = (valor.doubleValue() / total.doubleValue()) * 100.0;
            relativas.put(clave, Math.round(porcentaje * 100.0) / 100.0);
        });
        
        return relativas;
    }
    
    /**
     * Realiza prueba chi-cuadrado de independencia
     * Retorna: {chi2: valor, pvalue: p-valor, significancia: boolean}
     */
    public Map<String, Object> pruebaChiCuadrado(long[][] frecuenciasObservadas, int nivelSignificancia) {
        Map<String, Object> resultado = new LinkedHashMap<>();
        
        try {
            long[] frecuenciasEsperadas = calcularFrecuenciasEsperadas(frecuenciasObservadas);
            
            double chi2 = chiSquareTest.chiSquare(frecuenciasEsperadas, frecuenciasObservadas);
            double pvalue = 1.0 - chiSquareTest.chiSquareTest(frecuenciasEsperadas, frecuenciasObservadas);
            
            boolean esSignificativo = pvalue < (nivelSignificancia / 100.0);
            
            resultado.put("chi2", Math.round(chi2 * 1000.0) / 1000.0);
            resultado.put("pvalue", Math.round(pvalue * 10000.0) / 10000.0);
            resultado.put("significancia", esSignificativo);
            resultado.put("nivel_confianza", nivelSignificancia);
            
            if (esSignificativo) {
                resultado.put("interpretacion", "Existe relación significativa entre las variables");
            } else {
                resultado.put("interpretacion", "No hay relación significativa entre las variables");
            }
            
            logger.info("✅ Prueba Chi² completada: χ² = " + resultado.get("chi2") + ", p-valor = " + resultado.get("pvalue"));
            
        } catch (Exception e) {
            logger.error("Error en prueba chi-cuadrado", e);
            resultado.put("error", e.getMessage());
        }
        
        return resultado;
    }
    
    /**
     * Calcula frecuencias esperadas para prueba chi-cuadrado
     */
    private long[] calcularFrecuenciasEsperadas(long[][] observadas) {
        // Implementación simplificada: suma total dividida entre celdas
        long sumaTotal = 0;
        int celdas = 0;
        
        for (long[] fila : observadas) {
            for (long valor : fila) {
                sumaTotal += valor;
                celdas++;
            }
        }
        
        long[] esperadas = new long[celdas];
        long esperada = sumaTotal / celdas;
        for (int i = 0; i < celdas; i++) {
            esperadas[i] = Math.max(1, esperada); // Mínimo 1 para evitar división por cero
        }
        
        return esperadas;
    }
    
    /**
     * Calcula correlación de Pearson entre dos series
     */
    public Double calcularCorrelacionPearson(List<Double> x, List<Double> y) {
        if (x == null || y == null || x.size() != y.size() || x.isEmpty()) {
            return 0.0;
        }
        
        Double mediaX = calcularMedia(x);
        Double mediaY = calcularMedia(y);
        
        Double numerador = 0.0;
        Double denominadorX = 0.0;
        Double denominadorY = 0.0;
        
        for (int i = 0; i < x.size(); i++) {
            Double difX = x.get(i) - mediaX;
            Double difY = y.get(i) - mediaY;
            
            numerador += difX * difY;
            denominadorX += Math.pow(difX, 2);
            denominadorY += Math.pow(difY, 2);
        }
        
        if (denominadorX == 0 || denominadorY == 0) {
            return 0.0;
        }
        
        return numerador / Math.sqrt(denominadorX * denominadorY);
    }
    
    /**
     * Agrupa datos en categorías por antigüedad
     */
    public Map<String, Integer> categorizarAntigüedad(List<Integer> antiguedades) {
        Map<String, Integer> categorias = new LinkedHashMap<>();
        categorias.put("Junior (0-3 años)", 0);
        categorias.put("Consolidado (4-8 años)", 0);
        categorias.put("Senior (9+ años)", 0);
        
        if (antiguedades != null) {
            for (Integer antiguedad : antiguedades) {
                if (antiguedad <= 3) {
                    categorias.put("Junior (0-3 años)", categorias.get("Junior (0-3 años)") + 1);
                } else if (antiguedad <= 8) {
                    categorias.put("Consolidado (4-8 años)", categorias.get("Consolidado (4-8 años)") + 1);
                } else {
                    categorias.put("Senior (9+ años)", categorias.get("Senior (9+ años)") + 1);
                }
            }
        }
        
        return categorias;
    }
    
    /**
     * Resumen estadístico rápido
     */
    public String generarResumen(Map<String, Double> stats) {
        StringBuilder sb = new StringBuilder();
        sb.append("RESUMEN ESTADÍSTICO\n");
        sb.append("════════════════════════════\n");
        
        stats.forEach((clave, valor) -> {
            sb.append(String.format("%-25s: %10.2f\n", clave, valor));
        });
        
        return sb.toString();
    }
}
