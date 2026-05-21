import { useState } from 'react';
import { X, Save, Wheat } from 'lucide-react';
import { useDieta } from '../../context/DietaContext';
import { useRacao, type RacaoEmConstrucao } from '../../context/RacaoContext';
import { racaoParaAlimento, type ResultadoRacao } from '../../utils/calculosRacao';

interface Props {
  racao: RacaoEmConstrucao;
  resultado: ResultadoRacao;
  onClose: () => void;
}

export default function ModalSalvarRacao({ racao, resultado, onClose }: Props) {
  const { alimentos, adicionarAlimento, editarAlimento } = useDieta();
  const { limpar } = useRacao();
  const editando = !!racao.editando_nome;

  const [nome, setNome] = useState(
    racao.editando_nome
      ?? racao.nome
      ?? `Ração ${new Date().toLocaleDateString('pt-BR')}`
  );
  const [custo, setCusto] = useState(resultado.custo_por_kg.toFixed(3));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const conflito =
    !editando
    && alimentos.some(a => a.nome.toLowerCase() === nome.trim().toLowerCase());

  const salvar = async () => {
    setErro(null);
    if (!nome.trim()) { setErro('Informe o nome da ração.'); return; }
    if (conflito)    { setErro('Já existe um alimento com esse nome. Escolha outro.'); return; }

    const alimento = racaoParaAlimento(resultado, {
      nome: nome.trim(),
      fazenda: racao.fazenda,
      capacidade_misturador_kg: racao.capacidade_misturador_kg,
      custo_kg: Number(custo),
    });

    setSalvando(true);
    try {
      if (editando && racao.editando_nome) {
        await editarAlimento(racao.editando_nome, alimento);
      } else {
        await adicionarAlimento(alimento);
      }
      limpar();
      onClose();
    } catch (e) {
      setErro((e as Error).message || 'Erro ao salvar.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-start justify-center overflow-y-auto py-8">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-start justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Wheat size={20} className="text-amber-500" />
            <div>
              <h2 className="font-bold text-gray-800 text-lg">
                {editando ? 'Atualizar ração' : 'Salvar ração na biblioteca'}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Vira um alimento Concentrado, disponível para usar em qualquer dieta.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg flex-shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <label className="block text-xs">
            <span className="text-gray-600 font-medium">Nome da ração</span>
            <input
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              disabled={editando}
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:bg-gray-50"
            />
            {editando && (
              <span className="text-[11px] text-gray-400 mt-0.5 block">
                Nome não pode ser alterado em edição. Para renomear, crie uma cópia.
              </span>
            )}
          </label>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 border border-gray-100 rounded-lg p-2.5">
              <div className="text-[10px] text-gray-500 uppercase font-bold">Tipo</div>
              <div className="text-sm font-semibold text-blue-700">Concentrado (C)</div>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-lg p-2.5">
              <div className="text-[10px] text-gray-500 uppercase font-bold">Classificação</div>
              <div className="text-sm font-semibold text-gray-700">Concentrado</div>
            </div>
          </div>

          <label className="block text-xs">
            <span className="text-gray-600 font-medium">Custo da ração (R$/kg)</span>
            <input
              type="number"
              step="0.001"
              min="0"
              value={custo}
              onChange={e => setCusto(e.target.value)}
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <span className="text-[11px] text-gray-400 mt-0.5 block">
              Default = custo médio calculado da batida (R$/kg). Você pode editar
              depois pelo modal de Alimento como qualquer outro ingrediente.
            </span>
          </label>

          <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-900">
            <div className="font-semibold mb-1">Resumo da mistura</div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
              <span>• {resultado.ingredientes.length} ingredientes</span>
              <span>• {resultado.kg_batida_total.toFixed(0)} kg por batida</span>
              <span>• PB {(resultado.composicao.pb * 100).toFixed(1)}%</span>
              <span>• FDN {(resultado.composicao.fdn * 100).toFixed(1)}%</span>
              <span>• NDT {(resultado.composicao.ndt * 100).toFixed(1)}%</span>
              <span>• MS {(resultado.composicao.ms * 100).toFixed(1)}%</span>
            </div>
          </div>

          {erro && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-2.5">{erro}</div>
          )}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-gray-100">
          <button
            onClick={onClose}
            disabled={salvando}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={salvar}
            disabled={salvando || !nome.trim() || conflito}
            className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:bg-gray-300"
          >
            <Save size={14} /> {salvando ? 'Salvando...' : (editando ? 'Atualizar' : 'Salvar')}
          </button>
        </div>
      </div>
    </div>
  );
}
