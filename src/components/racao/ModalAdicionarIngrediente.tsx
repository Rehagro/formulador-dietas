import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Search, ArrowLeft } from 'lucide-react';
import type { Alimento, IngredienteRacao } from '../../types';

interface Props {
  alimentos: Alimento[];
  jaAdicionados: string[];                      // nomes já na ração — filtrados
  onAdd: (ing: IngredienteRacao) => void;
  onCancel: () => void;
}

export default function ModalAdicionarIngrediente({ alimentos, jaAdicionados, onAdd, onCancel }: Props) {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [selecionado, setSelecionado] = useState<Alimento | null>(null);
  const [kgD, setKgD] = useState<string>('1.0');
  const inputRef = useRef<HTMLInputElement>(null);
  const kgInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim().toLowerCase()), 250);
    return () => clearTimeout(id);
  }, [query]);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { if (selecionado) setTimeout(() => kgInputRef.current?.focus(), 50); }, [selecionado]);

  const resultados = useMemo(() => {
    const disponiveis = alimentos.filter(a => !jaAdicionados.includes(a.nome));
    if (!debounced) return disponiveis.slice(0, 60);
    return disponiveis.filter(a =>
      a.nome.toLowerCase().includes(debounced) ||
      a.classificacao.toLowerCase().includes(debounced)
    ).slice(0, 60);
  }, [alimentos, debounced, jaAdicionados]);

  const tipoBg = (t: string) =>
    t === 'C' ? 'bg-blue-100 text-blue-700' :
    t === 'F' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700';

  const confirmar = () => {
    if (!selecionado) return;
    const kg = Number(kgD);
    if (!isFinite(kg) || kg <= 0) return;
    onAdd({ alimento_nome: selecionado.nome, kg_d: kg });
  };

  // Confirmação de kg/d
  if (selecionado) {
    return (
      <div className="fixed inset-0 bg-black/50 z-[60] flex items-start justify-center overflow-y-auto py-8">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
          <div className="flex items-start justify-between p-5 border-b border-gray-100">
            <div className="min-w-0">
              <h2 className="font-bold text-gray-800 text-lg">Quanto a vaca consome por dia?</h2>
              <p className="text-sm text-gray-500 mt-1">
                {selecionado.nome}
              </p>
            </div>
            <button onClick={onCancel} className="p-1.5 hover:bg-gray-100 rounded-lg flex-shrink-0">
              <X size={18} />
            </button>
          </div>

          <div className="p-5 space-y-3">
            <label className="block text-xs">
              <span className="text-gray-600 font-medium">Consumo do animal (kg/dia em MN)</span>
              <input
                ref={kgInputRef}
                type="number"
                min="0.01"
                step="0.1"
                value={kgD}
                onChange={e => setKgD(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') confirmar(); }}
                className="mt-1 w-full border border-amber-300 rounded-lg px-3 py-2 text-base font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </label>
            <p className="text-xs text-gray-500">
              Para núcleos/aditivos que entram em pequena quantidade, valores típicos:
              núcleo mineral 0,15-0,30 kg/d; ureia 0,05-0,10 kg/d; óleo 0,20-0,40 kg/d.
            </p>
          </div>

          <div className="flex justify-between gap-2 p-4 border-t border-gray-100">
            <button
              onClick={() => setSelecionado(null)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft size={14} /> Trocar alimento
            </button>
            <div className="flex gap-2">
              <button onClick={onCancel} className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                Cancelar
              </button>
              <button
                onClick={confirmar}
                disabled={!Number(kgD) || Number(kgD) <= 0}
                className="px-4 py-2 text-sm text-white bg-amber-600 hover:bg-amber-700 rounded-lg disabled:bg-gray-300"
              >
                Adicionar à ração
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Lista de busca
  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-start justify-center overflow-y-auto py-8">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4">
        <div className="flex items-start justify-between p-5 border-b border-gray-100">
          <div className="min-w-0">
            <h2 className="font-bold text-gray-800 text-lg">Adicionar ingrediente à ração</h2>
            <p className="text-sm text-gray-500 mt-1">Busca no banco de alimentos. Após escolher, informe o consumo diário.</p>
          </div>
          <button onClick={onCancel} className="p-1.5 hover:bg-gray-100 rounded-lg flex-shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Digite: núcleo, ureia, óleo, soja, milho..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
        </div>

        <div className="max-h-[420px] overflow-y-auto">
          {resultados.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-gray-400">
              {jaAdicionados.length > 0
                ? 'Nenhum alimento encontrado (ingredientes já adicionados foram ocultados).'
                : 'Nenhum alimento encontrado.'}
            </div>
          )}
          {resultados.map(a => (
            <button
              key={a.id ?? a.nome}
              onClick={() => setSelecionado(a)}
              className="w-full text-left px-5 py-3 hover:bg-amber-50 border-b border-gray-50 flex items-center justify-between gap-3 group"
            >
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-gray-800 group-hover:text-amber-700 truncate">{a.nome}</div>
                <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-3 flex-wrap">
                  <span>{a.classificacao}</span>
                  <span className="text-gray-300">·</span>
                  <span>PB {a.pb !== null ? (a.pb * 100).toFixed(1) + '%' : '—'}</span>
                  <span className="text-gray-300">·</span>
                  <span>FDN {a.fdn !== null ? (a.fdn * 100).toFixed(1) + '%' : '—'}</span>
                  {a.custo != null && <><span className="text-gray-300">·</span><span>R$ {a.custo.toFixed(3)}/kg</span></>}
                </div>
              </div>
              <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${tipoBg(a.tipo)}`}>{a.tipo}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
