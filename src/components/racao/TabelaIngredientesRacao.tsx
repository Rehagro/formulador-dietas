import { Trash2 } from 'lucide-react';
import type { RacaoEmConstrucao } from '../../context/RacaoContext';
import type { IngredienteRacao } from '../../types';
import type { ResultadoRacao } from '../../utils/calculosRacao';

interface Props {
  racao: RacaoEmConstrucao;
  resultado: ResultadoRacao;
  onChangeIngredientes: (ings: IngredienteRacao[]) => void;
}

function pct(v: number | null | undefined, casas = 1): string {
  if (v == null || isNaN(v)) return '—';
  return (v * 100).toFixed(casas) + '%';
}

function num(v: number, casas = 2): string {
  if (!isFinite(v) || isNaN(v)) return '—';
  return v.toFixed(casas);
}

export default function TabelaIngredientesRacao({ racao, resultado, onChangeIngredientes }: Props) {
  const c = resultado.composicao;

  // Edições casam por nome (robusto a ingredientes faltantes/filtrados).
  const patchIngrediente = (nome: string, patch: Partial<IngredienteRacao>) => {
    onChangeIngredientes(
      racao.ingredientes.map(ing => ing.alimento_nome === nome ? { ...ing, ...patch } : ing),
    );
  };

  const onKgDChange = (nome: string, kg_d: number) =>
    patchIngrediente(nome, { kg_d });

  // Editar o kg da batida grava um override manual (ex: arredondar 61,5 → 62).
  // Recalcula % e total. É limpo ao mudar a capacidade do misturador.
  const onKgBatidaChange = (nome: string, kg_batida: number) =>
    patchIngrediente(nome, { kg_batida });

  const onRemove = (nome: string) =>
    onChangeIngredientes(racao.ingredientes.filter(ing => ing.alimento_nome !== nome));

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs tabular-nums">
          <thead className="bg-gray-50 text-gray-600 sticky top-0">
            <tr>
              <th className="text-left px-2 py-2 font-medium">Alimento</th>
              <th className="text-right px-2 py-2 font-medium" title="Consumo diário do animal">kg/d</th>
              <th className="text-right px-2 py-2 font-medium">% mistura</th>
              <th className="text-right px-2 py-2 font-medium bg-amber-50" title="Quanto pesar desta ração na batida">kg batida</th>
              <th className="text-right px-2 py-2 font-medium">%MS</th>
              <th className="text-right px-2 py-2 font-medium">%PB</th>
              <th className="text-right px-2 py-2 font-medium">%FDN</th>
              <th className="text-right px-2 py-2 font-medium">%EE</th>
              <th className="text-right px-2 py-2 font-medium">%Amido</th>
              <th className="text-right px-2 py-2 font-medium">%NDT</th>
              <th className="text-right px-2 py-2 font-medium">R$/kg</th>
              <th className="text-right px-2 py-2 font-medium">Custo R$</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {resultado.ingredientes.map((ic) => (
              <tr key={ic.alimento.nome} className="border-t border-gray-100 hover:bg-amber-50/30">
                <td className="px-2 py-1.5 text-left text-gray-800">{ic.alimento.nome}</td>
                <td className="px-2 py-1.5 text-right">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={ic.kg_d}
                    onChange={e => onKgDChange(ic.alimento.nome, Number(e.target.value) || 0)}
                    className="w-16 text-right tabular-nums bg-transparent border-b border-gray-200 focus:border-amber-500 focus:outline-none"
                  />
                </td>
                <td className="px-2 py-1.5 text-right">{(ic.fracao * 100).toFixed(2)}%</td>
                <td className="px-2 py-1.5 text-right bg-amber-50/50">
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={parseFloat(ic.kg_batida.toFixed(2))}
                    onChange={e => onKgBatidaChange(ic.alimento.nome, Number(e.target.value) || 0)}
                    className="w-20 text-right tabular-nums font-bold text-amber-900 bg-transparent border-b border-amber-200 focus:border-amber-500 focus:outline-none"
                    title="Quanto pesar na batida. Pode arredondar; muda o % e o total. Mudar a capacidade reseta."
                  />
                </td>
                <td className="px-2 py-1.5 text-right text-gray-600">{pct(ic.alimento.ms)}</td>
                <td className="px-2 py-1.5 text-right text-gray-600">{pct(ic.alimento.pb)}</td>
                <td className="px-2 py-1.5 text-right text-gray-600">{pct(ic.alimento.fdn)}</td>
                <td className="px-2 py-1.5 text-right text-gray-600">{pct(ic.alimento.ee)}</td>
                <td className="px-2 py-1.5 text-right text-gray-600">{pct(ic.alimento.amido)}</td>
                <td className="px-2 py-1.5 text-right text-gray-600">{pct(ic.alimento.ndt)}</td>
                <td className="px-2 py-1.5 text-right text-gray-600">{ic.alimento.custo != null ? ic.alimento.custo.toFixed(3) : '—'}</td>
                <td className="px-2 py-1.5 text-right text-gray-800">{ic.custo_batida.toFixed(2)}</td>
                <td className="px-1 py-1.5">
                  <button
                    onClick={() => onRemove(ic.alimento.nome)}
                    className="text-gray-400 hover:text-red-600 p-1"
                    title="Remover"
                  >
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50 font-bold text-gray-800 border-t-2 border-gray-300">
            <tr>
              <td className="px-2 py-2 text-left">Total / Composição da mistura</td>
              <td className="px-2 py-2 text-right">{num(resultado.consumo_total_kg_d, 2)}</td>
              <td className="px-2 py-2 text-right">100,00%</td>
              <td className="px-2 py-2 text-right text-amber-900 bg-amber-100">{num(resultado.kg_batida_total, 1)}</td>
              <td className="px-2 py-2 text-right">{pct(c.ms)}</td>
              <td className="px-2 py-2 text-right">{pct(c.pb)}</td>
              <td className="px-2 py-2 text-right">{pct(c.fdn)}</td>
              <td className="px-2 py-2 text-right">{pct(c.ee)}</td>
              <td className="px-2 py-2 text-right">{pct(c.amido)}</td>
              <td className="px-2 py-2 text-right">{pct(c.ndt)}</td>
              <td className="px-2 py-2 text-right">{resultado.custo_por_kg.toFixed(3)}</td>
              <td className="px-2 py-2 text-right">{resultado.custo_total.toFixed(2)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
