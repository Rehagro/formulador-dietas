import type { ResultadoDieta } from '../types';

interface Props {
  resultado: ResultadoDieta;
  leite: number;
  precoLeite: number;
  resultadoFoto?: ResultadoDieta | null;
}

function Metric({ icon, label, value, unit, colorClass, ringClass, foto }: {
  icon: string; label: string; value: string; unit?: string;
  colorClass: string; ringClass?: string; foto?: string;
}) {
  return (
    <div className={`flex flex-col ${ringClass ? `rounded-lg ring-2 ${ringClass} px-2.5 py-1` : ''}`}>
      <span className="text-xs text-gray-400 font-medium leading-none mb-1">{icon} {label}</span>
      <span className={`${foto !== undefined ? 'text-xl' : 'text-2xl'} font-bold tabular-nums leading-none ${colorClass}`}>
        {value}
        {unit && <span className="text-xs font-medium text-gray-400 ml-1">{unit}</span>}
      </span>
      {foto !== undefined && (
        <span className="text-lg font-bold tabular-nums leading-none mt-1.5 flex items-center gap-1 text-indigo-500">
          <span className="text-[10px] font-bold uppercase opacity-70">📷</span>{foto}
        </span>
      )}
    </div>
  );
}

export default function ResumoDieta({ resultado, leite, precoLeite, resultadoFoto }: Props) {
  const { totalKgMS, cmsExigida, leite_potencial_nel, leite_potencial_prot, fator_limitante } = resultado;
  const pctCMS = cmsExigida > 0 ? (totalKgMS / cmsExigida) * 100 : 0;
  const barColor =
    pctCMS < 85 ? 'bg-red-500' :
    pctCMS < 95 ? 'bg-amber-400' :
    pctCMS <= 110 ? 'bg-emerald-500' : 'bg-orange-500';

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-5 py-4 flex flex-wrap items-center gap-x-7 gap-y-3">
      <Metric icon="🥛" label="CMS exigida" value={cmsExigida.toFixed(1)} unit="kg MS/d" colorClass="text-orange-700"
        foto={resultadoFoto ? resultadoFoto.cmsExigida.toFixed(1) : undefined} />
      <Metric
        icon="⚡" label="Leite p/ energia" value={leite_potencial_nel.toFixed(1)} unit="kg/d"
        colorClass="text-emerald-700" ringClass={fator_limitante === 'energia' ? 'ring-emerald-400/70' : undefined}
        foto={resultadoFoto ? resultadoFoto.leite_potencial_nel.toFixed(1) : undefined}
      />
      <Metric
        icon="🧬" label="Leite p/ proteína" value={leite_potencial_prot.toFixed(1)} unit="kg/d"
        colorClass="text-violet-700" ringClass={fator_limitante === 'proteina' ? 'ring-violet-400/70' : undefined}
        foto={resultadoFoto ? resultadoFoto.leite_potencial_prot.toFixed(1) : undefined}
      />

      <div className="h-11 w-px bg-gray-200 hidden sm:block" />

      <Metric icon="💰" label="Custo" value={`R$ ${resultado.custoTotal.toFixed(2)}`} unit="/dia" colorClass="text-gray-700"
        foto={resultadoFoto ? `R$ ${resultadoFoto.custoTotal.toFixed(2)}` : undefined} />
      <Metric icon="⚖️" label="R$/kg MS" value={`R$ ${resultado.custoKgMS.toFixed(3)}`} colorClass="text-gray-700"
        foto={resultadoFoto ? `R$ ${resultadoFoto.custoKgMS.toFixed(3)}` : undefined} />
      <Metric icon="🥛" label="R$/litro" value={`R$ ${resultado.custoLitro.toFixed(3)}`} colorClass="text-gray-700"
        foto={resultadoFoto ? `R$ ${resultadoFoto.custoLitro.toFixed(3)}` : undefined} />
      {precoLeite > 0 && (
        <Metric icon="📈" label="Receita leite" value={`R$ ${(precoLeite * leite).toFixed(2)}`} unit="/d" colorClass="text-green-700" />
      )}

      {/* Barra CMS formulada vs exigida — ocupa todo o espaço livre à direita */}
      <div className="ml-auto min-w-[280px] flex-1">
        <div className="flex justify-between items-baseline text-sm text-gray-500 mb-1.5">
          <span className="font-medium">CMS formulada vs exigida</span>
          <span className="tabular-nums font-bold text-gray-700">
            {resultadoFoto && (
              <span className="text-[11px] text-gray-400 font-medium mr-2">📷 {resultadoFoto.totalKgMS.toFixed(1)} kg</span>
            )}
            {totalKgMS.toFixed(1)} / {cmsExigida.toFixed(1)} kg <span className="text-base ml-1">· {pctCMS.toFixed(0)}%</span>
          </span>
        </div>
        <div className="h-3.5 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-300 ${barColor}`} style={{ width: `${Math.min(pctCMS, 120)}%` }} />
        </div>
      </div>
    </div>
  );
}
