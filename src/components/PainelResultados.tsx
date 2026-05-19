import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { Referencia, ResultadoDieta } from '../types';
import { getReferenciasLactacao, getStatus, statusColor, statusDot } from '../utils/referencias';
import { formatarValor } from '../utils/calculos';

interface Props {
  resultado: ResultadoDieta;
  leite: number;
  precoLeite: number;
}

interface NutrienteRowProps {
  chave: string;
  valor: number;
  refs: Record<string, Referencia>;
}

function NutrienteRow({ chave, valor, refs }: NutrienteRowProps) {
  const ref = refs[chave];
  if (!ref) return null;
  const status = getStatus(valor, ref);
  const color = statusColor(status);
  const dot = statusDot(status);
  const valorFormatado = formatarValor(valor, ref.unidade);

  // Preferir ref string explícita (ex: FDNF/PV com faixas por lote)
  const refStr = ref.ref !== undefined
    ? ref.ref
    : ref.min !== undefined && ref.max !== undefined
    ? `${formatarValor(ref.min, ref.unidade)} – ${formatarValor(ref.max, ref.unidade)}`
    : ref.min !== undefined
    ? `≥ ${formatarValor(ref.min, ref.unidade)}`
    : ref.max !== undefined
    ? `≤ ${formatarValor(ref.max, ref.unidade)}`
    : '—';

  return (
    <div className={`flex items-center justify-between px-3 py-2 rounded-lg ${color}`}>
      <span className="text-sm font-semibold">{dot} {ref.label}</span>
      <div className="text-right">
        <span className="text-base font-bold tabular-nums">{valorFormatado}</span>
        <span className="text-xs ml-2 opacity-60">{refStr}</span>
      </div>
    </div>
  );
}

interface SecaoProps {
  titulo: string;
  chaves: string[];
  resultado: ResultadoDieta;
  refs: Record<string, Referencia>;
  defaultOpen?: boolean;
}

function Secao({ titulo, chaves, resultado, refs, defaultOpen = false }: SecaoProps) {
  const [open, setOpen] = useState(defaultOpen);

  const alertas = chaves.filter(k => {
    const ref = refs[k];
    if (!ref) return false;
    const v = resultado[k as keyof ResultadoDieta] as number;
    return ['critico_alto', 'critico_baixo'].includes(getStatus(v, ref));
  }).length;

  const avisos = chaves.filter(k => {
    const ref = refs[k];
    if (!ref) return false;
    const v = resultado[k as keyof ResultadoDieta] as number;
    return ['alto', 'baixo'].includes(getStatus(v, ref));
  }).length;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <span className="text-sm font-semibold text-gray-700">{titulo}</span>
        <div className="flex items-center gap-1.5">
          {alertas > 0 && (
            <span className="bg-red-100 text-red-700 text-xs font-bold px-1.5 py-0.5 rounded-full">
              {alertas}🔴
            </span>
          )}
          {avisos > 0 && (
            <span className="bg-amber-100 text-amber-700 text-xs font-bold px-1.5 py-0.5 rounded-full">
              {avisos}🟡
            </span>
          )}
          {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </div>
      </button>
      {open && (
        <div className="p-2.5 flex flex-col gap-1.5">
          {chaves.map(k => (
            <NutrienteRow
              key={k}
              chave={k}
              valor={resultado[k as keyof ResultadoDieta] as number}
              refs={refs}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function PainelResultados({ resultado, leite, precoLeite }: Props) {
  const refs = getReferenciasLactacao(leite);
  const { totalKgMS, cmsExigida, leite_potencial_nel, leite_potencial_prot, fator_limitante } = resultado;
  const pctCMS = cmsExigida > 0 ? (totalKgMS / cmsExigida) * 100 : 0;

  const barColor =
    pctCMS < 85 ? 'bg-red-500' :
    pctCMS < 95 ? 'bg-amber-400' :
    pctCMS <= 110 ? 'bg-emerald-500' : 'bg-orange-500';

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col gap-3">
      <h2 className="text-sm font-bold text-gray-700">
        📊 Resultados
      </h2>

      {/* CMS — barra de progresso */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
        <div className="text-base font-bold text-blue-700 mb-2">
          🥛 Consumo
        </div>
        <div className="flex justify-between text-sm text-blue-700 mb-1 font-medium">
          <span>CMS formulada vs exigida</span>
          <span className="tabular-nums font-bold">{totalKgMS.toFixed(1)} / {cmsExigida.toFixed(1)} kg</span>
        </div>
        <div className="h-2.5 bg-blue-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${barColor}`}
            style={{ width: `${Math.min(pctCMS, 120)}%` }}
          />
        </div>
        <div className="text-xs text-blue-500 text-right mt-1 tabular-nums">{pctCMS.toFixed(0)}%</div>
      </div>

      {/* Cards de leite potencial + custos */}
      <div className="grid grid-cols-2 gap-2">
        <div className={`border rounded-xl p-3 text-center ${fator_limitante === 'energia' ? 'bg-emerald-100 border-emerald-400 ring-2 ring-emerald-400' : 'bg-emerald-50 border-emerald-200'}`}>
          <div className="text-sm font-bold text-emerald-700 mb-1 leading-tight">
            ⚡ Leite Potencial para Energia
          </div>
          <div className="text-3xl font-bold text-emerald-800 tabular-nums leading-tight">
            {leite_potencial_nel.toFixed(1)}
          </div>
          <div className="text-xs text-emerald-600 mt-0.5">kg/dia</div>
        </div>
        <div className={`border rounded-xl p-3 text-center ${fator_limitante === 'proteina' ? 'bg-violet-100 border-violet-400 ring-2 ring-violet-400' : 'bg-violet-50 border-violet-200'}`}>
          <div className="text-sm font-bold text-violet-700 mb-1 leading-tight">
            🧬 Leite Potencial para Proteína
          </div>
          <div className="text-3xl font-bold text-violet-800 tabular-nums leading-tight">
            {leite_potencial_prot.toFixed(1)}
          </div>
          <div className="text-xs text-violet-600 mt-0.5">kg/dia</div>
        </div>
      </div>

      {/* Densidade energética da dieta (NASEM 2021 — cadeia DE → ME → NEL) */}
      {(resultado.dt_de || resultado.dt_me) && (
        <div className="text-[11px] text-gray-500 text-center tabular-nums px-2 -mt-1">
          <span className="font-medium">Densidade energética: </span>
          {resultado.dt_de !== undefined && <>DE {resultado.dt_de.toFixed(2)} · </>}
          {resultado.dt_me !== undefined && <>ME {resultado.dt_me.toFixed(2)} · </>}
          NEL {resultado.nel.toFixed(2)} <span className="text-gray-400">Mcal/kg MS</span>
        </div>
      )}

      {/* Cards de custo/receita */}
      <div className="grid grid-cols-2 gap-2">
        <div className="border border-gray-200 rounded-xl p-2 bg-gray-50">
          <div className="text-[11px] text-gray-500 font-medium">💰 Custo R$/dia</div>
          <div className="text-base font-bold tabular-nums text-gray-800 leading-tight">R$ {resultado.custoTotal.toFixed(2)}</div>
        </div>
        <div className="border border-gray-200 rounded-xl p-2 bg-gray-50">
          <div className="text-[11px] text-gray-500 font-medium">⚖️ Custo R$/kg MS</div>
          <div className="text-base font-bold tabular-nums text-gray-800 leading-tight">R$ {resultado.custoKgMS.toFixed(3)}</div>
        </div>
        <div className="border border-gray-200 rounded-xl p-2 bg-gray-50">
          <div className="text-[11px] text-gray-500 font-medium">🥛 Custo R$/litro</div>
          <div className="text-base font-bold tabular-nums text-gray-800 leading-tight">R$ {resultado.custoLitro.toFixed(3)}</div>
        </div>
        {precoLeite > 0 && (
          <div className="border border-green-200 rounded-xl p-2 bg-green-50">
            <div className="text-[11px] text-green-700 font-medium">📈 Receita leite R$/d</div>
            <div className="text-base font-bold tabular-nums text-green-800 leading-tight">R$ {(precoLeite * leite).toFixed(2)}</div>
          </div>
        )}
      </div>


      {/* Seções expansíveis */}
      <Secao titulo="⚡ Energia & Carboidratos" chaves={['nel', 'ndt', 'cnf', 'amido', 'amido_deg']} resultado={resultado} refs={refs} />
      <Secao titulo="🧬 Proteína" chaves={['pb', 'pdr', 'pndr', 'met', 'lys']} resultado={resultado} refs={refs} defaultOpen />
      <Secao titulo="🌾 Fibra" chaves={['fdn', 'efdn', 'fdnf', 'fda']} resultado={resultado} refs={refs} defaultOpen />
      <Secao titulo="🔬 Gordura" chaves={['ee', 'ee_insat']} resultado={resultado} refs={refs} />
      <Secao titulo="🧂 Macrominerais" chaves={['ca', 'p', 'mg', 'k', 's', 'na', 'cl']} resultado={resultado} refs={refs} />
      <Secao titulo="💊 Microminerais" chaves={['co', 'cu', 'mn_min', 'zn', 'se', 'i', 'fe']} resultado={resultado} refs={refs} />
      <Secao titulo="🌟 Vitaminas & Aditivos" chaves={['vit_a', 'vit_d3', 'vit_e', 'biotina', 'monensina', 'cr', 'levedura']} resultado={resultado} refs={refs} />
    </div>
  );
}
