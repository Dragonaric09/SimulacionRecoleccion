package com.simulacionem.analitica.application.service;

import com.simulacionem.analitica.application.dto.CompetenceComparisonDto;
import com.simulacionem.analitica.application.dto.CompetenceComparisonDto.Competencia;
import com.simulacionem.analitica.application.dto.CompetenceComparisonDto.Grupo;
import com.simulacionem.analitica.application.dto.CompetenceComparisonDto.Prueba;
import com.simulacionem.encuesta.infrastructure.persistence.entity.CompetenceCatalogEntity;
import com.simulacionem.encuesta.infrastructure.persistence.entity.CompetenceRatingEntity;
import com.simulacionem.encuesta.infrastructure.persistence.entity.DatasetImportEntity;
import com.simulacionem.encuesta.infrastructure.persistence.repository.CompetenceCatalogRepository;
import com.simulacionem.encuesta.infrastructure.persistence.repository.CompetenceRatingRepository;
import com.simulacionem.encuesta.infrastructure.persistence.repository.DatasetImportRepository;
import org.apache.commons.math3.distribution.NormalDistribution;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Random;
import java.util.TreeMap;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Compara, competencia por competencia, la valoración de titulados y empleadores.
 * <p>
 * Prueba elegida: <b>U de Mann-Whitney</b>. Los datos son ordinales (Likert 1–5), los grupos son independientes
 * y de tamaño distinto, y las respuestas no son normales; por eso no se usa t de Student ni χ². Con muestras
 * chicas (algún grupo con n &lt; 10) el p-valor se obtiene por permutación; si no, por aproximación normal con
 * corrección por empates. Como se contrastan 14 competencias a la vez, los p-valores se ajustan con Holm.
 */
@Service
public class ComparacionCompetenciasService {

    static final int N_MINIMO_POR_GRUPO = 5;
    static final int N_APROXIMACION_NORMAL = 10;
    static final int PERMUTACIONES = 20_000;
    private static final long SEMILLA = 20_260_101L;
    private static final NormalDistribution NORMAL = new NormalDistribution(null, 0, 1);

    private final DatasetImportRepository datasets;
    private final CompetenceRatingRepository ratings;
    private final CompetenceCatalogRepository catalog;

    public ComparacionCompetenciasService(DatasetImportRepository datasets, CompetenceRatingRepository ratings,
                                          CompetenceCatalogRepository catalog) {
        this.datasets = datasets;
        this.ratings = ratings;
        this.catalog = catalog;
    }

    @Transactional(readOnly = true)
    public CompetenceComparisonDto comparar(UUID tituladosId, UUID empleadoresId, double alfa) {
        if (alfa <= 0 || alfa >= 1) throw new IllegalArgumentException("alfa debe estar entre 0 y 1");
        DatasetImportEntity titulados = resolver(tituladosId, "TITULADOS");
        DatasetImportEntity empleadores = resolver(empleadoresId, "EMPLEADORES");
        Map<String, List<CompetenceRatingEntity>> porCompetenciaT = agrupar(titulados.getId());
        Map<String, List<CompetenceRatingEntity>> porCompetenciaE = agrupar(empleadores.getId());

        List<CompetenceCatalogEntity> competencias = catalog.findAll().stream()
                .sorted(Comparator.comparing(CompetenceCatalogEntity::getId)).toList();
        List<Competencia> filas = new ArrayList<>();
        for (CompetenceCatalogEntity competencia : competencias) {
            List<CompetenceRatingEntity> t = porCompetenciaT.getOrDefault(competencia.getCode(), List.of());
            List<CompetenceRatingEntity> e = porCompetenciaE.getOrDefault(competencia.getCode(), List.of());
            if (t.isEmpty() && e.isEmpty()) continue;
            int[] valoresT = observados(t);
            int[] valoresE = observados(e);
            Grupo grupoT = grupo(valoresT, t.size() - valoresT.length);
            Grupo grupoE = grupo(valoresE, e.size() - valoresE.length);
            filas.add(new Competencia(competencia.getCode(), competencia.getName(), competencia.getCompetenceGroup(),
                    grupoT, grupoE, diferencia(grupoE.media(), grupoT.media()),
                    diferencia(grupoE.mediana(), grupoT.mediana()), mannWhitney(valoresT, valoresE)));
        }
        return new CompetenceComparisonDto(titulados.getId(), nombre(titulados), empleadores.getId(),
                nombre(empleadores), alfa, "Holm", ajustarHolm(filas, alfa));
    }

    // ---------------------------------------------------------------------------------------------------------

    /** U de Mann-Whitney con U del grupo empleadores; r biserial = 2U/(n1·n2) − 1. */
    static Prueba mannWhitney(int[] titulados, int[] empleadores) {
        int n1 = titulados.length;
        int n2 = empleadores.length;
        if (Math.min(n1, n2) < N_MINIMO_POR_GRUPO) {
            return new Prueba("NO_APLICABLE", "No aplicable", false, null, null, null, null, false, null,
                    "Se necesitan al menos " + N_MINIMO_POR_GRUPO + " valoraciones observadas en cada encuesta "
                            + "(titulados n = " + n1 + ", empleadores n = " + n2 + ").");
        }
        int total = n1 + n2;
        double[] valores = new double[total];
        for (int i = 0; i < n1; i++) valores[i] = titulados[i];
        for (int i = 0; i < n2; i++) valores[n1 + i] = empleadores[i];
        double[] rangos = rangosPromedio(valores);
        double sumaRangosE = 0;
        for (int i = n1; i < total; i++) sumaRangosE += rangos[i];
        double u = sumaRangosE - n2 * (n2 + 1) / 2.0;
        double media = n1 * (double) n2 / 2.0;
        double rBiserial = redondear(2.0 * u / (n1 * (double) n2) - 1.0, 4);

        if (Math.min(n1, n2) < N_APROXIMACION_NORMAL) {
            double p = pValorPermutacion(rangos, n1, n2, Math.abs(u - media));
            return new Prueba("MANN_WHITNEY_PERMUTACION", "U de Mann-Whitney (permutación)", true, u, null,
                    redondear(p, 6), null, false, rBiserial,
                    "Datos ordinales (escala 1–5) de dos grupos independientes con algún grupo de n < "
                            + N_APROXIMACION_NORMAL + ": p-valor por " + PERMUTACIONES + " permutaciones de los rangos.");
        }
        double sumaEmpates = sumaEmpates(valores);
        double varianza = n1 * (double) n2 / 12.0 * ((total + 1) - sumaEmpates / (total * (double) (total - 1)));
        if (varianza <= 0) {
            return new Prueba("MANN_WHITNEY", "U de Mann-Whitney", true, u, 0.0, 1.0, null, false, rBiserial,
                    "Todas las valoraciones son iguales en ambos grupos: no hay diferencia que contrastar.");
        }
        double desviacion = Math.abs(u - media);
        double z = Math.signum(u - media) * Math.max(0.0, desviacion - 0.5) / Math.sqrt(varianza);
        double p = Math.min(1.0, 2.0 * (1.0 - NORMAL.cumulativeProbability(Math.abs(z))));
        return new Prueba("MANN_WHITNEY", "U de Mann-Whitney", true, u, redondear(z, 4), redondear(p, 6), null,
                false, rBiserial,
                "Datos ordinales (escala 1–5) de dos grupos independientes: se comparan las distribuciones por "
                        + "rangos (aproximación normal con corrección por empates y por continuidad).");
    }

    private static double pValorPermutacion(double[] rangos, int n1, int n2, double desviacionObservada) {
        double[] barajados = rangos.clone();
        double media = n1 * (double) n2 / 2.0;
        Random aleatorio = new Random(SEMILLA);
        int extremas = 0;
        for (int s = 0; s < PERMUTACIONES; s++) {
            for (int i = barajados.length - 1; i > 0; i--) {
                int j = aleatorio.nextInt(i + 1);
                double temporal = barajados[i];
                barajados[i] = barajados[j];
                barajados[j] = temporal;
            }
            double suma = 0;
            for (int i = n1; i < barajados.length; i++) suma += barajados[i];
            double u = suma - n2 * (n2 + 1) / 2.0;
            if (Math.abs(u - media) >= desviacionObservada - 1e-9) extremas++;
        }
        return (extremas + 1.0) / (PERMUTACIONES + 1.0);
    }

    static double[] rangosPromedio(double[] valores) {
        Integer[] orden = new Integer[valores.length];
        for (int i = 0; i < orden.length; i++) orden[i] = i;
        Arrays.sort(orden, Comparator.comparingDouble(i -> valores[i]));
        double[] rangos = new double[valores.length];
        int i = 0;
        while (i < orden.length) {
            int j = i;
            while (j + 1 < orden.length && valores[orden[j + 1]] == valores[orden[i]]) j++;
            double rango = (i + j) / 2.0 + 1.0;
            for (int k = i; k <= j; k++) rangos[orden[k]] = rango;
            i = j + 1;
        }
        return rangos;
    }

    private static double sumaEmpates(double[] valores) {
        Map<Double, Long> frecuencias = Arrays.stream(valores).boxed()
                .collect(Collectors.groupingBy(v -> v, Collectors.counting()));
        return frecuencias.values().stream().mapToDouble(t -> Math.pow(t, 3) - t).sum();
    }

    /** Holm-Bonferroni: controla el error tipo I familiar al contrastar varias competencias. */
    static List<Competencia> ajustarHolm(List<Competencia> filas, double alfa) {
        List<Integer> aplicables = new ArrayList<>();
        for (int i = 0; i < filas.size(); i++) if (filas.get(i).prueba().aplicable()) aplicables.add(i);
        aplicables.sort(Comparator.comparingDouble(i -> filas.get(i).prueba().pValor()));
        int m = aplicables.size();
        double[] ajustados = new double[filas.size()];
        double maximo = 0;
        for (int rango = 0; rango < m; rango++) {
            int indice = aplicables.get(rango);
            double ajustado = Math.min(1.0, (m - rango) * filas.get(indice).prueba().pValor());
            maximo = Math.max(maximo, ajustado);
            ajustados[indice] = maximo;
        }
        List<Competencia> resultado = new ArrayList<>();
        for (int i = 0; i < filas.size(); i++) {
            Competencia fila = filas.get(i);
            Prueba prueba = fila.prueba();
            if (prueba.aplicable()) {
                double ajustado = redondear(ajustados[i], 6);
                prueba = new Prueba(prueba.codigo(), prueba.nombre(), true, prueba.u(), prueba.z(), prueba.pValor(),
                        ajustado, ajustado < alfa, prueba.rBiserial(), prueba.motivo());
            }
            resultado.add(new Competencia(fila.code(), fila.name(), fila.group(), fila.titulados(),
                    fila.empleadores(), fila.diferenciaMedias(), fila.diferenciaMedianas(), prueba));
        }
        return resultado;
    }

    // ---------------------------------------------------------------------------------------------------------

    private DatasetImportEntity resolver(UUID id, String tipo) {
        if (id != null) {
            DatasetImportEntity dataset = datasets.findById(id)
                    .orElseThrow(() -> new NoSuchElementException("El dataset solicitado no existe o fue eliminado"));
            if (!tipo.equals(dataset.getSurveyType())) {
                throw new IllegalArgumentException("El dataset " + id + " no es de " + tipo.toLowerCase());
            }
            return dataset;
        }
        return datasets.findAll().stream()
                .filter(d -> tipo.equals(d.getSurveyType()))
                .max(Comparator.comparing(DatasetImportEntity::getImportedAt,
                        Comparator.nullsFirst(Comparator.<OffsetDateTime>naturalOrder())))
                .orElseThrow(() -> new NoSuchElementException("No hay un dataset de " + tipo.toLowerCase() + " cargado"));
    }

    private Map<String, List<CompetenceRatingEntity>> agrupar(UUID datasetId) {
        return ratings.findByResponse_Dataset_Id(datasetId).stream()
                .collect(Collectors.groupingBy(r -> r.getCompetence().getCode()));
    }

    private static int[] observados(List<CompetenceRatingEntity> valoraciones) {
        return valoraciones.stream()
                .filter(r -> !r.isNotObserved() && r.getNumericValue() != null)
                .mapToInt(r -> r.getNumericValue().intValue()).toArray();
    }

    private static Grupo grupo(int[] valores, long noObservado) {
        Map<Integer, Long> niveles = new TreeMap<>();
        for (int nivel = 1; nivel <= 5; nivel++) niveles.put(nivel, 0L);
        for (int valor : valores) niveles.merge(valor, 1L, Long::sum);
        if (valores.length == 0) return new Grupo(0, null, null, null, niveles, noObservado);
        double media = Arrays.stream(valores).average().orElse(0);
        int[] ordenados = valores.clone();
        Arrays.sort(ordenados);
        int medio = ordenados.length / 2;
        double mediana = ordenados.length % 2 == 0 ? (ordenados[medio - 1] + ordenados[medio]) / 2.0 : ordenados[medio];
        Double desviacion = null;
        if (valores.length > 1) {
            double suma = Arrays.stream(valores).mapToDouble(v -> Math.pow(v - media, 2)).sum();
            desviacion = redondear(Math.sqrt(suma / (valores.length - 1)), 2);
        }
        return new Grupo(valores.length, redondear(media, 2), redondear(mediana, 2), desviacion, niveles, noObservado);
    }

    private static Double diferencia(Double a, Double b) {
        return a == null || b == null ? null : redondear(a - b, 2);
    }

    private static String nombre(DatasetImportEntity dataset) {
        if (dataset.getDisplayName() != null && !dataset.getDisplayName().isBlank()) return dataset.getDisplayName();
        return dataset.getSourceFileName();
    }

    private static double redondear(double valor, int decimales) {
        double factor = Math.pow(10, decimales);
        return Math.round(valor * factor) / factor;
    }
}
