import type { ResultadoDieta } from '../types';
import { REFERENCIAS_LACTACAO, getStatus, statusColor, statusDot } from '../utils/referencias';

interface Props {
  resultado: ResultadoDieta;
}


function IndicStatus({ chave, resultado }: { chave: string; resultado: ResultadoDieta }) {
  const ref = REFERENCIAS_LACTACAO[chave];
  if (!ref) return null;
  const valor = resultado[chave as keyof ResultadoDieta] as number;
  const status = getStatus(valor, ref);
  const color = statusColor(status);
  const dot = statusDot(status);

  let valorStr = '';
  if (chave === 'fdnf_kg_pv') valorStr = (valor * 100).toFixed(2) + '%';
  else if (chave === 'pct_forragem_ms') valorStr = (valor * 100).toFixed(1) + '%';
  else if (chave === 'dcad') valorStr = valor.toFixed(0);
  else valorStr = valor.toFixed(2);

  // Preferir texto explícito de referência quando disponível
  const refStr = ref.ref !== undefined
    ? ref.ref
    : ref.min !== undefined && ref.max !== undefined
    ? `${ref.min} – ${ref.max} ${ref.unidade}`
    : ref.min !== undefined ? `≥ ${ref.min} ${ref.unidade}`
    : ref.max !== undefined ? `≤ ${ref.max} ${ref.unidade}`
    : '—';

  return (
    <div className={`border rounded-xl p-3 ${color}`}>
      <div className="text-xs font-semibold mb-1.5">{dot} {ref.label}</div>
      <div className="text-xl font-bold tabular-nums leading-tight">{valorStr}</div>
      <div className="text-xs opacity-60 mt-1.5 leading-snug">{refStr}</div>
    </div>
  );
}

export default function Indicadores({ resultado }: Props) {
  const { kPf, kPc, kPl } = resultado;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <h2 className="text-sm font-bold text-gray-700 mb-3">📈 Indicadores</h2>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-3">
        <IndicStatus chave="fdnf_kg_pv"      resultado={resultado} />
        <IndicStatus chave="pct_forragem_ms" resultado={resultado} />
        <IndicStatus chave="fdn8_amido_deg"  resultado={resultado} />
        <IndicStatus chave="lis_met"         resultado={resultado} />
        <IndicStatus chave="ca_p"            resultado={resultado} />
        <IndicStatus chave="dcad"            resultado={resultado} />
      </div>

      <div className="border border-gray-200 rounded-xl p-3 bg-gray-50 w-fit">
        <div className="text-xs text-gray-500 mb-1 font-medium">Taxas de Passagem</div>
        <div className="text-xs space-y-0.5 font-medium">
          <div>kPf: <span className="font-bold tabular-nums">{(kPf * 100).toFixed(2)}%/h</span></div>
          <div>kPc: <span className="font-bold tabular-nums">{(kPc * 100).toFixed(2)}%/h</span></div>
          <div>kPl: <span className="font-bold tabular-nums">{(kPl * 100).toFixed(2)}%/h</span></div>
        </div>
      </div>
    </div>
  );
}
