import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Search } from 'lucide-react';
import type { Alimento } from '../../types';
import { TIPO_LABEL } from './utils';

interface Props {
  alimentos: Alimento[];
  onSelecionar: (alimentoBase: Alimento) => void;
  onCancelar: () => void;
}

export default function ModalBuscaAlimentoBase({ alimentos, onSelecionar, onCancelar }: Props) {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim().toLowerCase()), 300);
    return () => clearTimeout(id);
  }, [query]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const resultados = useMemo(() => {
    if (!debounced) return alimentos.slice(0, 60);
    return alimentos.filter(a =>
      a.nome.toLowerCase().includes(debounced) ||
      a.classificacao.toLowerCase().includes(debounced)
    ).slice(0, 60);
  }, [alimentos, debounced]);

  const tipoBg = (t: string) =>
    t === 'C' ? 'bg-blue-100 text-blue-700' :
    t === 'F' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto py-8">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4">
        <div className="flex items-start justify-between p-5 border-b border-gray-100">
          <div className="min-w-0">
            <h2 className="font-bold text-gray-800 text-lg">Selecione um alimento como base</h2>
            <p className="text-sm text-gray-500 mt-1 leading-relaxed">
              Escolha o alimento mais parecido com o que você quer cadastrar. Você poderá editar
              os valores nutricionais na próxima tela.
            </p>
          </div>
          <button onClick={onCancelar} className="p-1.5 hover:bg-gray-100 rounded-lg flex-shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Digite o nome do alimento..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="text-xs text-gray-400 mt-1.5">
            {debounced ? `${resultados.length} resultado${resultados.length !== 1 ? 's' : ''}` : 'Mostrando todos'}
          </div>
        </div>

        <div className="max-h-[420px] overflow-y-auto">
          {resultados.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-gray-400">
              Nenhum alimento encontrado para "{query}".
            </div>
          )}
          {resultados.map(a => (
            <button
              key={a.id ?? a.nome}
              onClick={() => onSelecionar(a)}
              className="w-full text-left px-5 py-3 hover:bg-green-50 border-b border-gray-50 flex items-center justify-between gap-3 group"
            >
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-gray-800 group-hover:text-green-700 truncate">{a.nome}</div>
                <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-3 flex-wrap">
                  <span>{a.classificacao}</span>
                  <span className="text-gray-300">·</span>
                  <span>PB {a.pb !== null ? (a.pb * 100).toFixed(1) + '%' : '—'}</span>
                  <span className="text-gray-300">·</span>
                  <span>FDN {a.fdn !== null ? (a.fdn * 100).toFixed(1) + '%' : '—'}</span>
                </div>
              </div>
              <span
                className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${tipoBg(a.tipo)}`}
                title={TIPO_LABEL[a.tipo]}
              >
                {a.tipo}
              </span>
            </button>
          ))}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-gray-100">
          <button
            onClick={onCancelar}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
