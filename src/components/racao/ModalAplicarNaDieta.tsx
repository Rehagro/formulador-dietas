import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ArrowLeft, Wheat } from 'lucide-react';
import { useDieta } from '../../context/DietaContext';
import { useRacao, type RacaoEmConstrucao } from '../../context/RacaoContext';
import type { ResultadoRacao } from '../../utils/calculosRacao';

interface Props {
  racao: RacaoEmConstrucao;
  resultado: ResultadoRacao;
  onClose: () => void;
}

/**
 * "Aplicar na dieta": colapsa os insumos selecionados (origem_slot_ids) numa
 * única linha de ração local na dieta — na proporção definida aqui, com
 * kgMN = soma dos kg/d. Não altera o banco. O aluno digita o nome antes.
 */
export default function ModalAplicarNaDieta({ racao, resultado, onClose }: Props) {
  const { colapsarEmRacao } = useDieta();
  const { limpar } = useRacao();
  const navigate = useNavigate();

  const [nome, setNome] = useState(
    (racao.editando_nome || racao.nome || 'Ração da dieta').trim()
  );

  const slotIds = racao.origem_slot_ids ?? [];

  const aplicar = () => {
    const nomeFinal = nome.trim() || 'Ração da dieta';
    colapsarEmRacao(
      slotIds,
      nomeFinal,
      {
        receita: racao.ingredientes.map(i => ({ alimento_nome: i.alimento_nome, kg_d: i.kg_d })),
        capacidade_misturador_kg: racao.capacidade_misturador_kg,
      },
      resultado.consumo_total_kg_d,
    );
    limpar();
    navigate('/');
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-start justify-center overflow-y-auto py-8">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-start justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Wheat size={20} className="text-amber-500" />
            <div>
              <h2 className="font-bold text-gray-800 text-lg">Aplicar na dieta</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Os insumos selecionados viram uma única linha de ração na dieta.
                O banco não é alterado.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg flex-shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <label className="block text-xs">
            <span className="text-gray-600 font-medium">Nome da ração na dieta</span>
            <input
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              autoFocus
              placeholder="ex: Ração Lactação Alta"
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </label>

          <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-900">
            <div className="font-semibold mb-1">Resumo</div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
              <span>• {resultado.ingredientes.length} insumos</span>
              <span>• {resultado.consumo_total_kg_d.toFixed(2)} kg/d (MN) na dieta</span>
              <span>• PB {(resultado.composicao.pb * 100).toFixed(1)}%</span>
              <span>• NDT {(resultado.composicao.ndt * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            Cancelar
          </button>
          <button
            onClick={aplicar}
            disabled={slotIds.length === 0 || resultado.ingredientes.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:bg-gray-300"
          >
            <ArrowLeft size={14} /> Aplicar na dieta
          </button>
        </div>
      </div>
    </div>
  );
}
