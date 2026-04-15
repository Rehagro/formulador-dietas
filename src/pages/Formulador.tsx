import { useState, useMemo } from 'react';
import { Save, Download, RefreshCw, FileText } from 'lucide-react';
import { useDieta } from '../context/DietaContext';
import PainelAnimal from '../components/PainelAnimal';
import PainelResultados from '../components/PainelResultados';
import TabelaIngredientes from '../components/TabelaIngredientes';
import Indicadores from '../components/Indicadores';
import { calcularResultados } from '../utils/calculos';
import { exportarXLSX } from '../utils/exportar';
import { exportarPDF } from '../utils/exportarPDF';

export default function Formulador() {
  const { dieta, alimentos, setAnimal, setSlot, salvarDieta, novaDieta, adicionarSlot, reordenarSlots } = useDieta();
  const [nomeDieta, setNomeDieta] = useState(dieta.nome);
  const [salvando, setSalvando] = useState(false);
  const [toastVisivel, setToastVisivel] = useState(false);

  const resultado = useMemo(
    () => calcularResultados(dieta.slots, alimentos, dieta.animal),
    [dieta.slots, dieta.animal, alimentos]
  );

  async function handleSalvar() {
    setSalvando(true);
    try {
      await salvarDieta(nomeDieta);
      setToastVisivel(true);
      setTimeout(() => setToastVisivel(false), 2500);
    } finally {
      setSalvando(false);
    }
  }

  function handleExportar() {
    exportarXLSX({ ...dieta, nome: nomeDieta }, alimentos).catch(console.error);
  }

  function handleExportarPDF() {
    exportarPDF({ ...dieta, nome: nomeDieta }, alimentos);
  }

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-4 flex flex-col gap-4">
      {/* Toast de confirmação */}
      <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
        toastVisivel ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}>
        <div className="bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-xl flex items-center gap-2">
          ✅ Dieta salva com sucesso!
        </div>
      </div>
      {/* Barra de ações */}
      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="text"
          value={nomeDieta}
          onChange={e => setNomeDieta(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium flex-1 min-w-[200px] max-w-xs focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="Nome da dieta..."
        />
        <button
          onClick={handleSalvar}
          disabled={salvando}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            salvando
              ? 'bg-emerald-500 text-white cursor-default'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          <Save size={15} />
          {salvando ? 'Salvando...' : 'Salvar'}
        </button>
        <button
          onClick={handleExportar}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Download size={15} />
          XLSX
        </button>
        <button
          onClick={handleExportarPDF}
          className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
        >
          <FileText size={15} />
          PDF
        </button>
        <button
          onClick={() => { novaDieta(); setNomeDieta('Nova Dieta'); }}
          className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
        >
          <RefreshCw size={15} />
          Nova
        </button>
      </div>

      {/* Layout principal: 2 colunas — Animal + Resultados */}
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
        <PainelAnimal animal={dieta.animal} onChange={setAnimal} />
        <PainelResultados resultado={resultado} leite={dieta.animal.leite} />
      </div>

      {/* Tabela de ingredientes */}
      <TabelaIngredientes
        slots={dieta.slots}
        alimentos={alimentos}
        totalKgMS={resultado.totalKgMS}
        onSlotChange={setSlot}
        onAdicionarSlot={adicionarSlot}
        onReordenar={reordenarSlots}
      />

      {/* Indicadores */}
      <Indicadores resultado={resultado} precoLeite={dieta.animal.precoLeite} />
    </div>
  );
}
