import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { Composicao } from '../../utils/calculosRacao';

interface Props { composicao: Composicao; }

function pct(v: number, casas = 3): string {
  if (!isFinite(v) || isNaN(v)) return '—';
  return (v * 100).toFixed(casas) + '%';
}
function mg(v: number, casas = 1): string {
  if (!isFinite(v) || isNaN(v)) return '—';
  return v.toFixed(casas);
}

export default function PainelMineraisRacao({ composicao }: Props) {
  const [aberto, setAberto] = useState(false);
  const c = composicao;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setAberto(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <span className="text-sm font-semibold text-gray-700">
          🧂 Composição mineral e vitamínica da mistura (ponderada)
        </span>
        {aberto ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
      </button>
      {aberto && (
        <div className="p-3 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 text-xs">
          <Item label="Ca"  valor={pct(c.ca)} sufixo="% MS" />
          <Item label="P"   valor={pct(c.p)} sufixo="% MS" />
          <Item label="Mg"  valor={pct(c.mg)} sufixo="% MS" />
          <Item label="K"   valor={pct(c.k)} sufixo="% MS" />
          <Item label="Na"  valor={pct(c.na)} sufixo="% MS" />
          <Item label="Cl"  valor={pct(c.cl)} sufixo="% MS" />
          <Item label="S"   valor={pct(c.s)} sufixo="% MS" />
          <Item label="Cu"  valor={mg(c.cu)} sufixo="mg/kg" />
          <Item label="Fe"  valor={mg(c.fe)} sufixo="mg/kg" />
          <Item label="Mn"  valor={mg(c.mn_min)} sufixo="mg/kg" />
          <Item label="Zn"  valor={mg(c.zn)} sufixo="mg/kg" />
          <Item label="Co"  valor={mg(c.co, 3)} sufixo="mg/kg" />
          <Item label="Se"  valor={mg(c.se, 3)} sufixo="mg/kg" />
          <Item label="I"   valor={mg(c.i, 3)} sufixo="mg/kg" />
          {/* Aminoácidos */}
          <Item label="Met" valor={pct(c.met)} sufixo="% MS" />
          <Item label="Lis" valor={pct(c.lys)} sufixo="% MS" />
          {/* Vitaminas */}
          <Item label="Vit A"  valor={mg(c.vit_a, 0)} sufixo="UI/kg" />
          <Item label="Vit D3" valor={mg(c.vit_d3, 0)} sufixo="UI/kg" />
          <Item label="Vit E"  valor={mg(c.vit_e, 1)} sufixo="UI/kg" />
        </div>
      )}
    </div>
  );
}

function Item({ label, valor, sufixo }: { label: string; valor: string; sufixo: string }) {
  return (
    <div className="bg-gray-50 border border-gray-100 rounded px-2 py-1.5">
      <div className="text-[10px] text-gray-500 font-medium">{label}</div>
      <div className="text-sm font-bold text-gray-800 tabular-nums">{valor}</div>
      <div className="text-[9px] text-gray-400">{sufixo}</div>
    </div>
  );
}
