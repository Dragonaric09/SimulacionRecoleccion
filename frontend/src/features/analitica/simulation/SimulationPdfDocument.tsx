import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { SimulationExportData } from "../shared/simulationExportUtils";
import { simulationDelta, simulationPercent } from "./simulationUtils";

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 8, color: "#172033", fontFamily: "Helvetica" },
  title: { fontSize: 20, fontWeight: 700, marginBottom: 5 },
  subtitle: { fontSize: 9, color: "#52627a", marginBottom: 14 },
  warning: { color: "#9a3412", fontSize: 9, fontWeight: 700, marginBottom: 10 },
  panel: { borderRadius: 6, backgroundColor: "#f1f5f9", padding: 10, marginBottom: 10 },
  parameterGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  parameter: { width: "13%", minHeight: 28 },
  label: { fontSize: 7, fontWeight: 700, color: "#334155", marginBottom: 2 },
  value: { fontSize: 8, color: "#172033" },
  sectionTitle: { fontSize: 11, fontWeight: 700, marginBottom: 7 },
  sectionDescription: { color: "#52627a", marginBottom: 8 },
  probabilityRow: { flexDirection: "row", justifyContent: "space-between", borderBottom: "1 solid #e2e8f0", paddingVertical: 4 },
  probabilityColumns: { flexDirection: "row", gap: 18 },
  probabilityColumn: { flex: 1 },
  chart: { width: "100%", height: 250, objectFit: "contain", marginVertical: 8 },
  table: { borderWidth: 1, borderColor: "#cbd5e1" },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e2e8f0", minHeight: 22, alignItems: "center" },
  tableHeader: { backgroundColor: "#e2e8f0", fontWeight: 700 },
  tableTotal: { backgroundColor: "#f1f5f9", fontWeight: 700 },
  cell: { padding: 4, borderRightWidth: 1, borderRightColor: "#e2e8f0" },
  category: { width: "17%" },
  number: { width: "9%", textAlign: "right" },
  percent: { width: "10%", textAlign: "right" },
  range: { width: "17%", textAlign: "right" },
  deviation: { width: "13%", textAlign: "right" },
  draws: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  draw: { width: "19%", padding: 5, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 4 },
  twoColumns: { flexDirection: "row", gap: 24, marginTop: 12 },
  column: { flex: 1 },
  note: { marginTop: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#cbd5e1", color: "#52627a" },
  footer: { position: "absolute", bottom: 15, left: 28, right: 28, textAlign: "right", color: "#64748b", fontSize: 7 },
});

function segmentLabel(segment?: string) {
  if (!segment || segment === "all") return "Todos";
  if (segment === "female") return "Mujer";
  if (segment === "male") return "Hombre";
  return segment;
}

function Header({ data }: { data: SimulationExportData }) {
  return <>
    <Text style={styles.title}>Simulación de escenarios: {data.variableLabel}</Text>
    <Text style={styles.subtitle}>Dataset: {data.datasetName} · Generado: {new Intl.DateTimeFormat("es-BO", { timeZone: "America/La_Paz", dateStyle: "short" }).format(new Date())}</Text>
    <Text style={styles.warning}>Escenario hipotético, no es una predicción</Text>
    <View style={styles.panel}>
      <View style={styles.parameterGrid}>
        {["Variable", data.variableLabel, "Segmento", segmentLabel(data.segment), "Personas (N)", String(data.result.sampleSize), "Réplicas (R)", String(data.result.repetitions), "Semilla", String(data.result.seed), "Ajustes", data.adjusted ? "Personalizados" : "Observados"].reduce<Array<{ label: string; value: string }>>((items, item, index, values) => {
          if (index % 2 === 0) items.push({ label: item, value: values[index + 1] ?? "" });
          return items;
        }, []).map((item) => <View key={item.label} style={styles.parameter}><Text style={styles.label}>{item.label}</Text><Text style={styles.value}>{item.value}</Text></View>)}
        <View style={[styles.parameter, { width: "22%" }]}><Text style={styles.label}>Método</Text><Text style={styles.value}>Monte Carlo por transformada inversa</Text></View>
      </View>
    </View>
  </>;
}

export function SimulationPdfDocument({ data, chartDataUrl }: { data: SimulationExportData; chartDataUrl: string }) {
  const categories = data.result.categories;
  const probabilityColumns = categories.length > 6 ? [categories.slice(0, Math.ceil(categories.length / 2)), categories.slice(Math.ceil(categories.length / 2))] : [categories];
  return <Document title={`Simulación de escenarios: ${data.variableLabel}`} author="Simulación">
    <Page size="A4" orientation="landscape" style={styles.page} wrap>
      <Header data={data} />
      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>Probabilidades {data.adjusted ? "observadas y usadas" : "observadas"}</Text>
        <View style={probabilityColumns.length > 1 ? styles.probabilityColumns : undefined}>
          {probabilityColumns.map((column, columnIndex) => <View key={columnIndex} style={styles.probabilityColumn}>
            {column.map((category) => <View key={category.category} style={styles.probabilityRow}><Text>{data.categoryLabel(category.category)}</Text><Text>{simulationPercent((data.observedProbabilities[category.category] ?? 0) * 100)}{data.adjusted ? ` → ${simulationPercent((data.usedProbabilities[category.category] ?? 0) * 100)}` : ""}</Text></View>)}
          </View>)}
        </View>
      </View>
      <View wrap={false}>
        <Text style={styles.sectionTitle}>Observado contra escenario</Text>
        <Text style={styles.sectionDescription}>Distribución con media simulada y rango del 95 % de las réplicas.</Text>
        <Image src={chartDataUrl} style={styles.chart} />
      </View>
      <Text style={styles.footer} fixed render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
    </Page>
    <Page size="A4" orientation="landscape" style={styles.page} wrap>
      <Text style={styles.title}>Tabla comparativa</Text>
      <Text style={styles.subtitle}>Frecuencias, diferencias, medianas y rangos de todas las categorías.</Text>
      <View style={styles.table}>
        <View style={[styles.tableRow, styles.tableHeader]}><Text style={[styles.cell, styles.category]}>Categoría</Text><Text style={[styles.cell, styles.number]}>Obs. n</Text><Text style={[styles.cell, styles.percent]}>% obs.</Text>{data.adjusted && <Text style={[styles.cell, styles.percent]}>Prob. usada</Text>}<Text style={[styles.cell, styles.percent]}>Media</Text><Text style={[styles.cell, styles.percent]}>Mediana</Text><Text style={[styles.cell, styles.percent]}>Diferencia</Text><Text style={[styles.cell, styles.range]}>Rango 95 %</Text><Text style={[styles.cell, styles.deviation]}>Desv. est.</Text></View>
        {categories.map((category) => <View key={category.category} style={styles.tableRow} wrap={false}><Text style={[styles.cell, styles.category]}>{data.categoryLabel(category.category)}</Text><Text style={[styles.cell, styles.number]}>{category.observedCount}</Text><Text style={[styles.cell, styles.percent]}>{simulationPercent(category.observedPercentage)}</Text>{data.adjusted && <Text style={[styles.cell, styles.percent]}>{simulationPercent((data.usedProbabilities[category.category] ?? 0) * 100)}</Text>}<Text style={[styles.cell, styles.percent]}>{simulationPercent(category.simulatedMean)}</Text><Text style={[styles.cell, styles.percent]}>{simulationPercent(category.median ?? category.simulatedMean)}</Text><Text style={[styles.cell, styles.percent]}>{simulationDelta(category.simulatedMean, category.observedPercentage)}</Text><Text style={[styles.cell, styles.range]}>[{simulationPercent(category.lower95)} - {simulationPercent(category.upper95)}]</Text><Text style={[styles.cell, styles.deviation]}>{simulationPercent(category.standardDeviation)}</Text></View>)}
        <View style={[styles.tableRow, styles.tableTotal]} wrap={false}><Text style={[styles.cell, styles.category]}>Total</Text><Text style={[styles.cell, styles.number]}>{data.observedTotal}</Text><Text style={[styles.cell, styles.percent]}>100,0 %</Text>{data.adjusted && <Text style={[styles.cell, styles.percent]}>100,0 %</Text>}<Text style={[styles.cell, styles.percent]}>100,0 %</Text><Text style={[styles.cell, styles.percent]}>—</Text><Text style={[styles.cell, styles.percent]}>0,0 pp</Text><Text style={[styles.cell, styles.range]}>—</Text><Text style={[styles.cell, styles.deviation]}>—</Text></View>
      </View>
      <View style={styles.note}><Text>El rango del 95 % es el intervalo en que cayeron el 95 % de las réplicas. No es un intervalo de confianza.</Text><Text>Semilla: {data.result.seed}. Permite repetir exactamente el resultado.</Text></View>
      <Text style={styles.footer} fixed render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
    </Page>
    <Page size="A4" orientation="landscape" style={styles.page} wrap>
      <Text style={styles.title}>Cómo funciona</Text>
      <Text style={styles.subtitle}>Transformada inversa y primeros sorteos.</Text>
      <View style={styles.twoColumns}>
        <View style={styles.column}>
          <Text style={styles.sectionTitle}>Probabilidad acumulada</Text>
          {(data.result.cumulativeProbabilities ?? []).map((end, index) => <View key={categories[index]?.category ?? index} style={styles.probabilityRow}><Text>{data.categoryLabel(categories[index]?.category ?? "")}</Text><Text>{simulationPercent(end * 100)}</Text></View>)}
        </View>
        <View style={styles.column}>
          <Text style={styles.sectionTitle}>Primeros 10 números aleatorios</Text>
          <View style={styles.draws}>{(data.result.firstDraws ?? []).map((draw, index) => <View key={`${draw.random}-${index}`} style={styles.draw}><Text>{index + 1}. {draw.random.toFixed(2)} -&gt; {data.categoryLabel(draw.category)}</Text></View>)}</View>
        </View>
      </View>
      <Text style={styles.footer} fixed render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
    </Page>
  </Document>;
}
