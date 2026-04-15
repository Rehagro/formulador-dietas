import { useState } from 'react';
import { ChevronDown, ChevronRight, Info } from 'lucide-react';
import type { Referencia, ResultadoDieta } from '../types';
import { getReferenciasLactacao, getStatus, statusColor, statusDot } from '../utils/referencias';
import { formatarValor } from '../utils/calculos';

interface Props {
  resultado: ResultadoDieta;
  leite: number;
}

interface NutrienteRowProps {
  chave: string;
  valor: number;
  refs: Record<string, Referencia>;
}

function InfoTooltip({ texto }: { texto: string }) {
  return (
    <span className="relative group inline-flex items-center">
      <Info size={14} className="text-gray-400 hover:text-gray-600 cursor-help ml-1 flex-shrink-0" />
      <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 w-96 bg-gray-800 text-white text-[13px] rounded-xl px-4 py-3 opacity-0 group-hover:opacity-100 transition-opacity z-[9999] leading-relaxed shadow-2xl whitespace-pre-line">
        {texto}
      </span>
    </span>
  );
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

export default function PainelResultados({ resultado, leite }: Props) {
  const refs = getReferenciasLactacao(leite);
  const { totalKgMS, cmsExigida, leite_potencial_nel, leite_potencial_prot } = resultado;
  const pctCMS = cmsExigida > 0 ? (totalKgMS / cmsExigida) * 100 : 0;

  const barColor =
    pctCMS < 85 ? 'bg-red-500' :
    pctCMS < 95 ? 'bg-amber-400' :
    pctCMS <= 110 ? 'bg-emerald-500' : 'bg-orange-500';

  // Faixa de produção para exibir no label PB/CNF
  const faixaLeite = leite >= 30 ? '≥30L' : leite >= 20 ? '20–30L' : '<20L';

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col gap-3">
      <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
        📊 Resultados
        <span className="text-xs font-normal text-gray-400 ml-1">refs. PB/CNF para {faixaLeite}</span>
      </h2>

      {/* CMS — barra de progresso */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
        <div className="text-xs font-bold text-blue-700 mb-2 flex items-center">
          🥛 Consumo
          <InfoTooltip texto={
            "CMS exigida — NRC 2001\n\nEquação de predição de consumo voluntário para vacas em lactação:\n\nCMS = [3,7 + (5,7 × paridade) + (0,305 × NEL_leite × leite) + (0,022 × PV) + ((-0,689 − 1,87 × paridade) × ECC)] × [1 − (0,212 + 0,136 × paridade) × e^(−0,053 × DEL)]\n\nOnde:\n• Paridade: 0 = novilha, 1 = vaca adulta\n• NEL_leite = 0,0929×gord% + 0,0547×prot% + 0,0395×lact%\n• PV = peso vivo (kg)\n• ECC = escore de condição corporal (1–5)\n• DEL = dias em lactação"
          } />
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

      {/* Cards de leite potencial */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
          <div className="text-xs font-semibold text-emerald-700 mb-1 flex items-center justify-center">
            ⚡ Leite Potencial Energia
            <InfoTooltip texto={
              "Leite potencial por energia — NRC 2021\n\nEnergia disponível para lactação:\nNEL disponível = NEL total da dieta − mantença\nMantença = 0,08 × PV^0,75 Mcal/d\n\nExigência energética por kg de leite:\nNEL/kg = 0,0929×gord% + 0,0547×prot% + 0,0395×lact%\n\nLeite potencial = NEL disponível ÷ NEL/kg leite\n\nInterpretação: produção máxima suportada pela energia da dieta, descontada a mantença."
            } />
          </div>
          <div className="text-2xl font-bold text-emerald-800 tabular-nums leading-tight">
            {leite_potencial_nel.toFixed(1)}
          </div>
          <div className="text-xs text-emerald-600 mt-0.5">kg/dia</div>
        </div>
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 text-center">
          <div className="text-xs font-semibold text-violet-700 mb-1 flex items-center justify-center">
            🧬 Leite Potencial Proteína
            <InfoTooltip texto={
              "Leite potencial por proteína — NRC 2021\n\nUsa Proteína Metabolizável (MP): proteína que chega ao intestino.\n\nFontes de MP:\n• MP de PNDR = PNDR × 0,80 (digestibilidade intestinal)\n• MP microbiana = NDT × 0,13 × 0,64\n  (130 g MCP/kg NDT × 64% de digestibilidade)\n\nMP total = MP de PNDR + MP microbiana\n\nLeite potencial = MP total ÷ (prot_leite% ÷ 0,67)\n\nO 0,67 é a eficiência de uso do MP para síntese de proteína do leite (NRC 2021)."
            } />
          </div>
          <div className="text-2xl font-bold text-violet-800 tabular-nums leading-tight">
            {leite_potencial_prot.toFixed(1)}
          </div>
          <div className="text-xs text-violet-600 mt-0.5">kg/dia</div>
        </div>
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
