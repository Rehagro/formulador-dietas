import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { Referencia, ResultadoDieta } from '../types';
import { getReferenciasLactacao, getStatus, statusColor, statusDot } from '../utils/referencias';
import { formatarValor } from '../utils/calculos';

interface Props {
  resultado: ResultadoDieta;
  leite: number;
  resultadoFoto?: ResultadoDieta | null;
}

// Nutrientes que exibem 1 casa decimal (energia, proteína, fibra, gordura) —
// valor e faixa de referência. Met/Lys e a aba Minerais & Vitaminas mantêm 2 casas.
const NUTRIENTES_1_CASA = new Set([
  'cnf', 'amido', 'amido_deg',
  'pb', 'pdr', 'pndr',
  'fdn', 'efdn', 'fdnf', 'fda',
  'ee', 'ee_insat',
]);

function NutrienteRow({ chave, valor, valorFoto, refs }: {
  chave: string; valor: number; valorFoto?: number | null; refs: Record<string, Referencia>;
}) {
  const ref = refs[chave];
  if (!ref) return null;
  const status = getStatus(valor, ref);
  const color = statusColor(status);
  const dot = statusDot(status);
  const casas = NUTRIENTES_1_CASA.has(chave) ? 1 : undefined;
  const valorFormatado = formatarValor(valor, ref.unidade, casas);
  const fotoFormatado = valorFoto != null ? formatarValor(valorFoto, ref.unidade, casas) : null;

  // Faixa-recomendação (orientador pedagógico — mantida por pedido do usuário)
  const refStr = ref.ref !== undefined
    ? ref.ref
    : ref.min !== undefined && ref.max !== undefined
    ? `${formatarValor(ref.min, ref.unidade, casas)} – ${formatarValor(ref.max, ref.unidade, casas)}`
    : ref.min !== undefined
    ? `≥ ${formatarValor(ref.min, ref.unidade, casas)}`
    : ref.max !== undefined
    ? `≤ ${formatarValor(ref.max, ref.unidade, casas)}`
    : '';

  return (
    <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md ${color}`}>
      <span className="text-[13px] font-semibold flex-1 min-w-0 truncate">{dot} {ref.label}</span>
      {fotoFormatado !== null && (
        <span className="w-[58px] text-right text-base font-bold tabular-nums text-indigo-600" title="Valor da foto">
          {fotoFormatado}
        </span>
      )}
      <span className="w-[58px] text-right text-base font-bold tabular-nums">{valorFormatado}</span>
      <span className="w-[72px] text-right text-xs opacity-60 leading-tight">{refStr}</span>
    </div>
  );
}

function Grupo({ titulo, chaves, resultado, resultadoFoto, refs, defaultOpen = false }: {
  titulo: string; chaves: string[]; resultado: ResultadoDieta;
  resultadoFoto?: ResultadoDieta | null;
  refs: Record<string, Referencia>; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const visiveis = chaves.filter(k => refs[k]);
  if (visiveis.length === 0) return null;

  const conta = (cats: string[]) => visiveis.filter(k =>
    cats.includes(getStatus(resultado[k as keyof ResultadoDieta] as number, refs[k]))).length;
  const alertas = conta(['critico_alto', 'critico_baixo']);
  const avisos = conta(['alto', 'baixo']);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <span className="text-xs font-semibold text-gray-700">{titulo}</span>
        <div className="flex items-center gap-1.5">
          {alertas > 0 && (
            <span className="bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{alertas}🔴</span>
          )}
          {avisos > 0 && (
            <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{avisos}🟡</span>
          )}
          {open ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
        </div>
      </button>
      {open && (
        <div className="p-2 flex flex-col gap-1">
          {resultadoFoto && (
            <div className="flex items-center gap-2 px-2.5 pb-0.5">
              <span className="flex-1 min-w-0" />
              <span className="w-[58px] text-right text-[11px] font-bold uppercase text-indigo-500">📷 Foto</span>
              <span className="w-[58px] text-right text-[11px] font-bold uppercase text-gray-500">Atual</span>
              <span className="w-[72px]" />
            </div>
          )}
          {visiveis.map(k => (
            <NutrienteRow
              key={k}
              chave={k}
              valor={resultado[k as keyof ResultadoDieta] as number}
              valorFoto={resultadoFoto ? (resultadoFoto[k as keyof ResultadoDieta] as number) : null}
              refs={refs}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// NEl e NDT removidos do painel (pedido do usuário — pouca informação).
interface GrupoCfg { titulo: string; chaves: string[]; defaultOpen: boolean; }
const ABAS: Record<'nutrientes' | 'minerais', GrupoCfg[]> = {
  nutrientes: [
    { titulo: '⚡ Energia & Carboidratos', chaves: ['cnf', 'amido', 'amido_deg'], defaultOpen: false },
    { titulo: '🧬 Proteína', chaves: ['pb', 'pdr', 'pndr', 'met', 'lys'], defaultOpen: true },
    { titulo: '🌾 Fibra', chaves: ['fdn', 'efdn', 'fdnf', 'fda'], defaultOpen: true },
    { titulo: '🔬 Gordura', chaves: ['ee', 'ee_insat'], defaultOpen: false },
  ],
  minerais: [
    { titulo: '🧂 Macrominerais', chaves: ['ca', 'p', 'mg', 'k', 's', 'na', 'cl'], defaultOpen: true },
    { titulo: '💊 Microminerais', chaves: ['co', 'cu', 'mn_min', 'zn', 'se', 'i', 'fe'], defaultOpen: false },
    { titulo: '🌟 Vitaminas & Aditivos', chaves: ['vit_a', 'vit_d3', 'vit_e', 'biotina', 'monensina', 'cr', 'levedura'], defaultOpen: false },
  ],
};

export default function PainelNutrientes({ resultado, leite, resultadoFoto }: Props) {
  const [aba, setAba] = useState<'nutrientes' | 'minerais'>('nutrientes');
  const refs = getReferenciasLactacao(leite);

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
      <div className="flex border-b border-gray-200">
        {([['nutrientes', 'Nutrientes'], ['minerais', 'Minerais & Vitaminas']] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setAba(id)}
            className={`flex-1 px-3 py-2.5 text-xs font-semibold transition-colors ${
              aba === id
                ? 'text-green-700 border-b-2 border-green-600 bg-green-50/40'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="p-2.5 flex flex-col gap-2">
        {ABAS[aba].map(g => (
          <Grupo key={g.titulo} titulo={g.titulo} chaves={g.chaves} resultado={resultado} resultadoFoto={resultadoFoto} refs={refs} defaultOpen={g.defaultOpen} />
        ))}
      </div>
    </div>
  );
}
