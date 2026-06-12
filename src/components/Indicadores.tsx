import type { ResultadoDieta } from '../types';
import { REFERENCIAS_LACTACAO, getStatus, statusColor, statusDot } from '../utils/referencias';

interface Props {
  resultado: ResultadoDieta;
  resultadoFoto?: ResultadoDieta | null;
}

/** Formata o valor de um indicador (mesma regra para valor atual e foto). */
function fmtIndic(chave: string, valor: number): string {
  if (!isFinite(valor) || (valor === 0 && ['fdn8_amido_deg', 'lis_met'].includes(chave))) return '—';
  if (chave === 'fdnf_kg_pv') return (valor * 100).toFixed(2) + '%';
  if (chave === 'pct_forragem_ms') return (valor * 100).toFixed(1) + '%';
  if (chave === 'dcad') return valor.toFixed(0);
  return valor.toFixed(2);
}

function IndicStatus({ chave, resultado, resultadoFoto }: { chave: string; resultado: ResultadoDieta; resultadoFoto?: ResultadoDieta | null }) {
  const ref = REFERENCIAS_LACTACAO[chave];
  if (!ref) return null;
  const valor = resultado[chave as keyof ResultadoDieta] as number;
  // Quando o valor é 0 (ou não finito) E a chave depende de campos opcionais que
  // podem não estar preenchidos, exibimos "—" em vez de "0.00".
  const indisponivel =
    !isFinite(valor) ||
    (valor === 0 && ['fdn8_amido_deg', 'lis_met'].includes(chave));
  const status = indisponivel ? 'sem_ref' : getStatus(valor, ref);
  const color = statusColor(status);
  const dot = indisponivel ? '⚪' : statusDot(status);

  const valorStr = fmtIndic(chave, valor);
  const fotoStr = resultadoFoto
    ? fmtIndic(chave, resultadoFoto[chave as keyof ResultadoDieta] as number)
    : null;

  // Preferir texto explícito de referência quando disponível
  const refStr = ref.ref !== undefined
    ? ref.ref
    : ref.min !== undefined && ref.max !== undefined
    ? `${ref.min} – ${ref.max} ${ref.unidade}`
    : ref.min !== undefined ? `≥ ${ref.min} ${ref.unidade}`
    : ref.max !== undefined ? `≤ ${ref.max} ${ref.unidade}`
    : '—';

  return (
    <div className={`border rounded-lg p-2 ${color}`}>
      <div className="text-[11px] font-semibold mb-0.5 leading-tight">{dot} {ref.label}</div>
      {fotoStr !== null ? (
        <div className="flex items-baseline gap-1.5 leading-tight">
          <span className="text-sm font-bold tabular-nums">{valorStr}</span>
          <span className="text-sm font-bold tabular-nums text-indigo-500" title="Valor da foto">📷 {fotoStr}</span>
        </div>
      ) : (
        <div className="text-base font-bold tabular-nums leading-tight">{valorStr}</div>
      )}
      <div className="text-[10px] opacity-60 mt-0.5 leading-snug">{refStr}</div>
    </div>
  );
}

export default function Indicadores({ resultado, resultadoFoto }: Props) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
      <h2 className="text-sm font-bold text-gray-700 mb-2">📈 Indicadores</h2>

      <div className="grid grid-cols-3 gap-2">
        {['fdnf_kg_pv', 'pct_forragem_ms', 'fdn8_amido_deg', 'lis_met', 'ca_p', 'dcad'].map(chave => (
          <IndicStatus key={chave} chave={chave} resultado={resultado} resultadoFoto={resultadoFoto} />
        ))}
      </div>
    </div>
  );
}
