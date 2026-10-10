import type { Competence } from "../shared/analyticsTypes";
import { Inbox } from "lucide-react";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart } from "recharts";

function formatDecimal(value: number, digits = 2) {
  return value.toFixed(digits).replace(".", ",");
}

export function CompetenceRadar({
  items,
  className = "",
}: {
  items: Competence[];
  className?: string;
}) {
  const plotted = items.slice(0, 8);
  const chartData = plotted.map((item) => ({
    subject: `${radarLabel(item.name)} (${formatDecimal(item.average)})`,
    average: item.average,
    name: item.name,
  }));
  const chartConfig = {
    average: { label: "Media observada", color: "#1f6fb5" },
  };
  const renderRadarChart = (fixed = false) => (
    <RadarChart
      {...(fixed ? { width: 460, height: 320 } : {})}
      data={chartData}
      outerRadius="60%"
    >
      <PolarGrid stroke="#cbd5e1" strokeDasharray="2 2" />
      <PolarAngleAxis dataKey="subject" tick={<RadarTick />} />
      <PolarRadiusAxis domain={[0, 5]} tick={false} axisLine={false} />
      <Radar
        name="Media observada"
        dataKey="average"
        stroke="#1f6fb5"
        fill="#1f6fb5"
        fillOpacity={0.24}
        strokeWidth={2.25}
        isAnimationActive={false}
      />
      {!fixed && <ChartTooltip content={<ChartTooltipContent />} />}
    </RadarChart>
  );
  return (
    <Card
      className={`print-radar-card min-w-0 overflow-hidden rounded-xl border-0 shadow-sm ${className}`}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="title-card">Media por competencia</CardTitle>
            <CardDescription>
              Escala continua de 1,0 a 5,0
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {plotted.length ? (
          <div className="flex min-w-0 flex-col items-center">
            <div className="radar-responsive-chart">
              <ChartContainer config={chartConfig} className="h-[380px] w-full max-w-[520px] aspect-auto" initialDimension={{ width: 1000, height: 380 }}>
                {renderRadarChart()}
              </ChartContainer>
            </div>
            <div className="radar-fixed-chart" aria-label="Radar de medias por competencia para impresión">
              <RadarPrintSvg items={plotted} />
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-5 border-t border-surface-container-high pt-3 text-xs">
              <span className="flex items-center gap-1.5 font-medium text-ink-900">
                <i className="h-1.5 w-4 rounded-sm bg-titulados" />
                Media observada
              </span>
            </div>
          </div>
        ) : (
          <Empty className="py-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Inbox />
              </EmptyMedia>
              <EmptyTitle>Sin competencias disponibles</EmptyTitle>
              <EmptyDescription>
                No hay datos suficientes para mostrar este radar.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </CardContent>
    </Card>
  );
}

function RadarPrintSvg({ items }: { items: Competence[] }) {
  const width = 760;
  const height = 400;
  const centerX = width / 2;
  const centerY = 200;
  const radius = 120;
  const count = Math.max(items.length, 1);
  const point = (index: number, value: number, scale = radius) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / count;
    return { x: centerX + Math.cos(angle) * scale * (value / 5), y: centerY + Math.sin(angle) * scale * (value / 5) };
  };
  const axisPoint = (index: number, scale = radius) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / count;
    return { x: centerX + Math.cos(angle) * scale, y: centerY + Math.sin(angle) * scale };
  };
  const polygon = items.map((item, index) => {
    const p = point(index, item.average);
    return `${p.x},${p.y}`;
  }).join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Media por competencia" preserveAspectRatio="xMidYMid meet">
      {[1, 2, 3, 4, 5].map((level) => (
        <polygon key={level} points={items.map((_, index) => { const p = point(index, 5, radius * level / 5); return `${p.x},${p.y}`; }).join(" ")} fill="none" stroke="#cbd5e1" strokeDasharray="2 2" />
      ))}
      {items.map((item, index) => { const p = axisPoint(index); const label = radarLabel(item.name); const labelLines = radarLabelLines(label); const labelPoint = axisPoint(index, radius + 38); const angle = -Math.PI / 2 + (index * Math.PI * 2) / count; const anchor = Math.cos(angle) > 0.25 ? "start" : Math.cos(angle) < -0.25 ? "end" : "middle"; return <g key={item.code}>
        <line x1={centerX} y1={centerY} x2={p.x} y2={p.y} stroke="#cbd5e1" />
        <text x={labelPoint.x} y={labelPoint.y} textAnchor={anchor} fontSize="11" fill="#334155">
          {labelLines.map((line, lineIndex) => <tspan key={line} x={labelPoint.x} dy={lineIndex === 0 ? 0 : 13}>{line}</tspan>)}
          <tspan x={labelPoint.x} dy="13" fontWeight="700" fill="#0f3f6d">{formatDecimal(item.average)}</tspan>
        </text>
      </g>; })}
      <polygon points={polygon} fill="#1f6fb5" fillOpacity="0.24" stroke="#1f6fb5" strokeWidth="2.25" />
      {items.map((item, index) => { const p = point(index, item.average); return <circle key={`${item.code}-point`} cx={p.x} cy={p.y} r="3.5" fill="#1f6fb5" />; })}
    </svg>
  );
}


function radarLabelLines(label: string) {
  const words = label.split(/\s+/);
  if (label.length <= 17 || words.length < 2) return [label];
  const midpoint = Math.ceil(words.length / 2);
  return [words.slice(0, midpoint).join(" "), words.slice(midpoint).join(" ")];
}

type RadarTickProps = {
  x?: number;
  y?: number;
  textAnchor?: "start" | "middle" | "end";
  payload?: { value?: string };
};

function RadarTick({
  x = 0,
  y = 0,
  textAnchor = "middle",
  payload,
}: RadarTickProps) {
  const value = String(payload?.value ?? "");
  if (value.length <= 22) {
    return (
      <text x={x} y={y} textAnchor={textAnchor} fill="#0f172a" fontSize={10} fontWeight={600}>
        {value}
      </text>
    );
  }

  const words = value.split(" ");
  const score = words.pop() ?? "";
  const midpoint = Math.ceil(words.join(" ").length / 2);
  let splitAt = 0;
  let distance = Number.POSITIVE_INFINITY;
  words.forEach((_, index) => {
    const candidate = words.slice(0, index + 1).join(" ");
    const candidateDistance = Math.abs(candidate.length - midpoint);
    if (candidateDistance < distance) {
      distance = candidateDistance;
      splitAt = index + 1;
    }
  });
  const firstLine = words.slice(0, splitAt).join(" ");
  const secondLine = `${words.slice(splitAt).join(" ")} ${score}`.trim();

  return (
    <text x={x} y={y} textAnchor={textAnchor} fill="#0f172a" fontSize={10} fontWeight={600}>
      <tspan x={x} dy="-0.55em">
        {firstLine}
      </tspan>
      <tspan x={x} dy="1.1em">
        {secondLine}
      </tspan>
    </text>
  );
}

function radarLabel(name: string) {
  const normalized = name.toLowerCase();
  if (normalized.includes("programación")) return "Programación";
  if (normalized.includes("bases")) return "Bases de datos";
  if (normalized.includes("requisitos")) return "Requisitos y modelado";
  if (normalized.includes("análisis")) return "Análisis de datos";
  if (normalized.includes("gestión")) return "Gestión de proyectos";
  if (normalized.includes("redes")) return "Redes";
  if (normalized.includes("seguridad")) return "Seguridad";
  if (normalized.includes("cloud")) return "Cloud / DevOps";
  return name;
}
