import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Trash2, Pencil, Download, FlaskConical, BarChart2 } from 'lucide-react';
import { useDieta } from '../context/DietaContext';
import { calcularResultados } from '../utils/calculos';
import { exportarXLSX } from '../utils/exportar';

export default function Dietas() {
  const { dietas, dieta: dietaAtiva, alimentos, carregarDieta, duplicarDieta, excluirDieta, renomearDieta } = useDieta();
  const navigate = useNavigate();
  const [editandoNome, setEditandoNome] = useState<string | null>(null);
  const [novoNome, setNovoNome] = useState('');
  const [comparando, setComparando] = useState<string[]>([]);

  function toggleComparar(id: string) {
    setComparando(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 2 ? [...prev, id] : prev
    );
  }

  const dietasComparar = comparando.map(id => dietas.find(d => d.id === id)).filter(Boolean);

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">📋 Minhas Dietas</h1>
        <div className="text-sm text-gray-500">{dietas.length} dieta{dietas.length !== 1 ? 's' : ''} salva{dietas.length !== 1 ? 's' : ''}</div>
      </div>

      {dietas.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-4">📭</div>
          <p>Nenhuma dieta salva ainda.</p>
          <p className="text-sm mt-1">Vá ao Formulador e salve uma dieta.</p>
        </div>
      )}

      {/* Comparação */}
      {comparando.length === 2 && dietasComparar.length === 2 && (
        <div className="mb-6 bg-white border border-blue-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-800 flex items-center gap-2"><BarChart2 size={16} /> Comparação</h2>
            <button onClick={() => setComparando([])} className="text-xs text-gray-400 hover:text-gray-600">Limpar</button>
          </div>
          <div className="grid grid-cols-[200px_1fr_1fr] gap-2 text-sm">
            <div className="font-semibold text-gray-600">Nutriente</div>
            {dietasComparar.map(d => (
              <div key={d!.id} className="font-semibold text-gray-700 truncate">{d!.nome}</div>
            ))}
            {['cms', 'pb', 'fdn', 'efdn', 'nel', 'ca', 'p'].map(key => {
              const vals = dietasComparar.map(d => {
                const r = calcularResultados(d!.slots, alimentos, d!.animal);
                return r[key as keyof typeof r] as number;
              });
              return (
                <>
                  <div key={key + '_label'} className="text-gray-500 py-1 border-t border-gray-100">{key.toUpperCase()}</div>
                  {vals.map((v, i) => (
                    <div key={i} className={`py-1 border-t border-gray-100 font-mono ${
                      vals.length === 2 && vals[0] !== vals[1]
                        ? (i === 0 ? (vals[0] > vals[1] ? 'text-green-600' : 'text-red-600') : (vals[1] > vals[0] ? 'text-green-600' : 'text-red-600'))
                        : 'text-gray-700'
                    }`}>
                      {typeof v === 'number' ? v.toFixed(4) : '—'}
                    </div>
                  ))}
                </>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid gap-3">
        {dietas.map(d => {
          const isAtiva = d.id === dietaAtiva.id;
          const isComparando = comparando.includes(d.id);
          const resultado = calcularResultados(d.slots, alimentos, d.animal);
          const slots = d.slots.filter(s => s.alimentoNome && s.kgMN > 0);

          return (
            <div
              key={d.id}
              className={`bg-white border rounded-xl p-4 shadow-sm transition-all ${
                isAtiva ? 'border-green-400 ring-1 ring-green-300' : isComparando ? 'border-blue-400 ring-1 ring-blue-300' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {editandoNome === d.id ? (
                    <div className="flex gap-2">
                      <input
                        autoFocus
                        type="text"
                        value={novoNome}
                        onChange={e => setNovoNome(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') { renomearDieta(d.id, novoNome); setEditandoNome(null); }
                          if (e.key === 'Escape') setEditandoNome(null);
                        }}
                        className="border border-gray-300 rounded px-2 py-1 text-sm flex-1 focus:outline-none focus:ring-1 focus:ring-green-500"
                      />
                      <button
                        onClick={() => { renomearDieta(d.id, novoNome); setEditandoNome(null); }}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                      >OK</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-800 truncate">{d.nome}</h3>
                      {isAtiva && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Ativa</span>}
                    </div>
                  )}
                  <div className="text-xs text-gray-400 mt-0.5">
                    Criada em {new Date(d.criadaEm).toLocaleDateString('pt-BR')} · {slots.length} ingredientes · {resultado.totalKgMS.toFixed(1)} kg MS/d
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {d.animal.leite} kg leite · {d.animal.peso} kg · DEL {d.animal.del}d
                    {' · '}CMS {resultado.totalKgMS.toFixed(1)}/{resultado.cmsExigida.toFixed(1)} kg
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => toggleComparar(d.id)}
                    title="Comparar"
                    className={`p-2 rounded-lg text-xs transition-colors ${isComparando ? 'bg-blue-100 text-blue-700' : 'text-gray-400 hover:bg-gray-100'}`}
                  >
                    <BarChart2 size={14} />
                  </button>
                  <button
                    onClick={() => { setEditandoNome(d.id); setNovoNome(d.nome); }}
                    title="Renomear"
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => duplicarDieta(d.id)}
                    title="Duplicar"
                    className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    onClick={() => exportarXLSX(d, alimentos)}
                    title="Exportar XLSX"
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Download size={14} />
                  </button>
                  <button
                    onClick={() => { carregarDieta(d.id); navigate('/'); }}
                    title="Abrir no formulador"
                    className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  >
                    <FlaskConical size={14} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Excluir "${d.nome}"?`)) excluirDieta(d.id);
                    }}
                    title="Excluir"
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
