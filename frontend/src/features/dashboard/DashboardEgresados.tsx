import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import KpiCard from '../../components/ui/KpiCard';
import TabButton from '../../components/ui/TabButton';
import {
  COLORS,
  dataEdad,
  dataRemuneracion,
  dataSituacionLaboral,
  dataTiempoEmpleo,
  kpiData,
} from './mockData';

type TabId = 'perfil' | 'insercion' | 'evaluacion';

interface TabDefinition {
  id: TabId;
  label: string;
}

const tabs: TabDefinition[] = [
  { id: 'perfil', label: '1. Perfil' },
  { id: 'insercion', label: '2. Inserción Laboral' },
  { id: 'evaluacion', label: '3. Evaluación' },
];

const coloresSituacionLaboral = [COLORS.verde, COLORS.azulClaro, COLORS.ambar];

const DashboardEgresados = () => {
  const [activeTab, setActiveTab] = useState<TabId>('perfil');

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
          Recolección y parametrización
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          Dashboard de egresados
        </h1>
        <p className="mt-2 text-slate-600">
          Indicadores para el análisis y la simulación de inserción laboral.
        </p>
      </header>

      <section
        aria-label="Indicadores principales"
        className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <KpiCard
          titulo="Total de encuestados"
          valor={kpiData.totalEncuestados}
          highlight
        />
        <KpiCard titulo="Empleabilidad" valor={kpiData.empleabilidad} />
        <KpiCard
          titulo="Tiempo promedio al primer empleo"
          valor={kpiData.tiempoPromedioPrimerEmpleo}
        />
        <KpiCard titulo="Salario más frecuente" valor={kpiData.salarioFrecuente} />
        <KpiCard
          titulo="Interés en posgrado"
          valor={kpiData.interesPosgrado}
        />
        <KpiCard titulo="Satisfacción" valor={kpiData.satisfaccion} />
      </section>

      <nav
        aria-label="Secciones del dashboard"
        role="tablist"
        className="mb-6 flex gap-2 overflow-x-auto border-b border-slate-200"
      >
        {tabs.map((tab) => (
          <TabButton
            key={tab.id}
            id={tab.id}
            label={tab.label}
            activeTab={activeTab}
            onClick={setActiveTab}
          />
        ))}
      </nav>

      {activeTab === 'perfil' && (
        <section
          aria-label="Perfil de los egresados"
          className="grid grid-cols-1 gap-6 xl:grid-cols-2"
        >
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Distribución por edad
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Cantidad de egresados por rango de edad.
            </p>
            <div className="mt-4 h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dataEdad}
                  margin={{ top: 8, right: 12, left: 0, bottom: 8 }}
                >
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="rangoEdad"
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip />
                  <Bar
                    dataKey="cantidad"
                    name="Egresados"
                    fill={COLORS.azul}
                    radius={[5, 5, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Situación laboral
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Actividad laboral actual de las personas encuestadas.
            </p>
            <div className="mt-4 h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dataSituacionLaboral}
                    dataKey="cantidad"
                    nameKey="situacion"
                    innerRadius={72}
                    outerRadius={112}
                    paddingAngle={3}
                  >
                    {dataSituacionLaboral.map((dato, index) => {
                      return (
                        <Cell
                          key={dato.situacion}
                          fill={
                            coloresSituacionLaboral[
                              index % coloresSituacionLaboral.length
                            ]
                          }
                        />
                      );
                    })}
                  </Pie>
                  <Tooltip />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    wrapperStyle={{ fontSize: '13px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </article>
        </section>
      )}

      {activeTab === 'insercion' && (
        <section
          aria-label="Inserción laboral de los egresados"
          className="grid grid-cols-1 gap-6 xl:grid-cols-2"
        >
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Tiempo hasta el primer empleo
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              La mayor frecuencia se concentra en los primeros meses, con una
              cola larga de tiempos de espera.
            </p>
            <p className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">
              Variable de entrada para ajustar la distribución de la simulación
              mediante el método de la transformada inversa.
            </p>
            <div className="mt-4 h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dataTiempoEmpleo}
                  margin={{ top: 8, right: 12, left: 0, bottom: 8 }}
                >
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="meses"
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip />
                  <Bar
                    dataKey="frecuencia"
                    name="Encuestados"
                    fill={COLORS.celeste}
                    radius={[5, 5, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Remuneración por sector
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Encuestados por rango salarial y sector de empleo.
            </p>
            <div className="mt-4 h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dataRemuneracion}
                  layout="vertical"
                  margin={{ top: 8, right: 16, left: 12, bottom: 8 }}
                >
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="rangoSalarial"
                    width={118}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '13px' }} />
                  <Bar
                    dataKey="sectorPublico"
                    name="Sector público"
                    stackId="sector"
                    fill={COLORS.sectores.publico}
                  />
                  <Bar
                    dataKey="sectorPrivado"
                    name="Sector privado"
                    stackId="sector"
                    fill={COLORS.sectores.privado}
                    radius={[0, 5, 5, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>
        </section>
      )}

      {activeTab === 'evaluacion' && (
        <section
          aria-label="Evaluación de los egresados"
          className="grid grid-cols-1 gap-6 lg:grid-cols-2"
        >
          <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Satisfacción con la formación
            </p>
            <p className="mt-3 text-4xl font-bold tracking-tight text-blue-700">
              {kpiData.satisfaccion}
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Proporción de egresados que reporta satisfacción con la formación
              recibida.
            </p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Interés en continuar estudios de posgrado
            </p>
            <p className="mt-3 text-4xl font-bold tracking-tight text-indigo-700">
              {kpiData.interesPosgrado}
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Porcentaje de encuestados interesado en continuar su formación
              académica después del egreso.
            </p>
          </article>
        </section>
      )}
    </main>
  );
};

export default DashboardEgresados;