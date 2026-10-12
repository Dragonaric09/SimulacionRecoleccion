export interface KpiData {
  totalEncuestados: number;
  empleabilidad: string;
  tiempoPromedioPrimerEmpleo: string;
  salarioFrecuente: string;
  interesPosgrado: string;
  satisfaccion: string;
}

export interface DatoEdad {
  rangoEdad: string;
  cantidad: number;
}

export interface DatoSituacionLaboral {
  situacion: string;
  cantidad: number;
}

export interface DatoTiempoEmpleo {
  meses: string;
  frecuencia: number;
}

export interface DatoRemuneracion {
  rangoSalarial: string;
  sectorPublico: number;
  sectorPrivado: number;
}

export const kpiData: KpiData = {
  totalEncuestados: 486,
  empleabilidad: '78.4%',
  tiempoPromedioPrimerEmpleo: '5.8 meses',
  salarioFrecuente: 'Bs 4,001–6,000',
  interesPosgrado: '64.2%',
  satisfaccion: '82.7%',
};

export const dataEdad: DatoEdad[] = [
  { rangoEdad: '20–24', cantidad: 74 },
  { rangoEdad: '25–29', cantidad: 186 },
  { rangoEdad: '30–34', cantidad: 132 },
  { rangoEdad: '35–39', cantidad: 61 },
  { rangoEdad: '40 o más', cantidad: 33 },
];

export const dataSituacionLaboral: DatoSituacionLaboral[] = [
  { situacion: 'Trabaja', cantidad: 328 },
  { situacion: 'Emprende', cantidad: 53 },
  { situacion: 'Desempleado', cantidad: 105 },
];

export const dataTiempoEmpleo: DatoTiempoEmpleo[] = [
  { meses: '0–1', frecuencia: 132 },
  { meses: '2–3', frecuencia: 116 },
  { meses: '4–6', frecuencia: 94 },
  { meses: '7–9', frecuencia: 58 },
  { meses: '10–12', frecuencia: 38 },
  { meses: '13–18', frecuencia: 27 },
  { meses: '19–24', frecuencia: 14 },
  { meses: 'Más de 24', frecuencia: 7 },
];

export const dataRemuneracion: DatoRemuneracion[] = [
  { rangoSalarial: 'Hasta Bs 2,000', sectorPublico: 18, sectorPrivado: 42 },
  { rangoSalarial: 'Bs 2,001–4,000', sectorPublico: 38, sectorPrivado: 84 },
  { rangoSalarial: 'Bs 4,001–6,000', sectorPublico: 46, sectorPrivado: 96 },
  { rangoSalarial: 'Bs 6,001–8,000', sectorPublico: 24, sectorPrivado: 50 },
  { rangoSalarial: 'Más de Bs 8,000', sectorPublico: 13, sectorPrivado: 27 },
];

export const COLORS = {
  azul: '#2563eb',
  azulClaro: '#60a5fa',
  celeste: '#38bdf8',
  verde: '#10b981',
  ambar: '#f59e0b',
  rojo: '#f87171',
  gris: '#94a3b8',
  sectores: {
    publico: '#6366f1',
    privado: '#0ea5e9',
  },
} as const;
