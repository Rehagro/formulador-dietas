import { Trash2 } from 'lucide-react';
import type { RacaoEmConstrucao } from '../../context/RacaoContext';
import type { ResultadoRacao } from '../../utils/calculosRacao';

interface Props {
  racao: RacaoEmConstrucao;
  resultado: ResultadoRacao;
  /** Aplica um patch ao estado da ração (ingredientes e/ou capacidade) com uma
   *  chave de coalescência para agrupar digitação num único passo de desfazer. */
  onPatch: (patch: Partial<RacaoEmConstrucao>, coalesceKey?: string) => void;
}

function pct(v: number | null | undefined, casas = 1): string {
  if (v == null || isNaN(v)) return '—';
  return (v * 100).toFixed(casas) + '%';
}

function num(v: number, casas = 2): string {
  if (!isFinite(v) || isNaN(v)) return '—';
  return v.toFixed(casas);
}

export default function TabelaIngredientesRacao({ racao, resultado, onPatch }: Props) {
  const c = resultado.composicao;

  // Escala = kg da batida por kg/d. É o invariante das duas colunas: só muda
  // quando o usuário edita a capacidade do misturador. Editar kg/d OU kg batida
  // de um insumo mantém a escala e atualiza a outra coluna proporcionalmente.
  const consumo = resultado.consumo_total_kg_d;
  const escala = consumo > 0
    ? resultado.kg_batida_total / consumo
    : (racao.capacidade_misturador_kg > 0 ? racao.capacidade_misturador_kg : 1);

  // Recalcula ingredientes + capacidade mantendo a escala congelada (o total da
  // batida acompanha a soma dos kg/d).
  const aplicarKgD = (nome: string, kg_d: number, coalesceKey: string) => {
    const ings = racao.ingredientes.map(ing => ing.alimento_nome === nome ? { ...ing, kg_d } : ing);
    const novoConsumo = ings.reduce((s, i) => s + (i.kg_d > 0 ? i.kg_d : 0), 0);
    onPatch({ ingredientes: ings, capacidade_misturador_kg: novoConsumo * escala }, coalesceKey);
  };

  const onKgDChange = (nome: string, kg_d: number) =>
    aplicarKgD(nome, kg_d, `kgd:${nome}`);

  // Editar o kg da batida → recalcula o kg/d desse insumo (kg_d = kg_batida / escala),
  // mantendo a escala. As duas colunas e o total ficam coerentes.
  const onKgBatidaChange = (nome: string, kg_batida: number) =>
    aplicarKgD(nome, escala > 0 ? kg_batida / escala : 0, `batida:${nome}`);

  const onRemove = (nome: string) =>
    onPatch({ ingredientes: racao.ingredientes.filter(ing => ing.alimento_nome !== nome) });

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
                    step="0.01"
                    value={parseFloat(ic.kg_d.toFixed(2))}
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
