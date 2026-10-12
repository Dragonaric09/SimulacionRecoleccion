export interface KpiCardProps {
  titulo: string;
  valor: string | number;
  highlight?: boolean;
}

const KpiCard = ({ titulo, valor, highlight = false }: KpiCardProps) => (
  <article
    className={`rounded-xl border p-5 shadow-sm transition-shadow hover:shadow-md ${
      highlight
        ? 'border-blue-200 bg-blue-50'
        : 'border-slate-200 bg-white'
    }`}
  >
    <h2 className="text-sm font-medium text-slate-500">{titulo}</h2>
    <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
      {valor}
    </p>
  </article>
);

export default KpiCard;