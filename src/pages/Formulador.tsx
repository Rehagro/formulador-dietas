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
  const [exportandoXLSX, setExportandoXLSX] = useState(false);
  const [exportandoPDF, setExportandoPDF] = useState(false);
  const [criandoNova, setCriandoNova] = useState(false);
  const [toastVisivel, setToastVisivel] = useState(false);
  const [toastMsg, setToastMsg] = useState('✅ Dieta salva com sucesso!');

  const resultado = useMemo(
    () => calcularResultados(dieta.slots, alimentos, dieta.animal),
    [dieta.slots, dieta.animal, alimentos]
  );

  function showToast(msg: string) {
    setToastMsg(msg);
    setToastVisivel(true);
    setTimeout(() => setToastVisivel(false), 2500);
  }

  async function handleSalvar() {
    setSalvando(true);
    try {
      await salvarDieta(nomeDieta);
      showToast('✅ Dieta salva com sucesso!');
    } finally {
      setSalvando(false);
    }
  }

  async function handleExportar() {
    setExportandoXLSX(true);
    try {
      await exportarXLSX({ ...dieta, nome: nomeDieta }, alimentos);
      showToast('📊 Excel gerado com sucesso!');
    } finally {
      setExportandoXLSX(false);
    }
  }

  function handleExportarPDF() {
    setExportandoPDF(true);
    try {
      exportarPDF({ ...dieta, nome: nomeDieta }, alimentos);
      showToast('📄 PDF gerado com sucesso!');
    } finally {
      setTimeout(() => setExportandoPDF(false), 800);
    }
  }

  function handleNovaDieta() {
    setCriandoNova(true);
    setTimeout(() => {
      novaDieta();
      setNomeDieta('Nova Dieta');
      setCriandoNova(false);
    }, 400);
  }

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-4 flex flex-col gap-4">
      {/* Toast */}
      <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
        toastVisivel ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}>
        <div className="bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-xl">
          {toastMsg}
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
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            salvando ? 'bg-emerald-500 text-white cursor-default scale-95' : 'bg-green-600 hover:bg-green-700 text-white hover:scale-105 active:scale-95'
          }`}
        >
          <Save size={15} className={salvando ? 'animate-spin' : ''} />
          {salvando ? 'Salvando...' : 'Salvar'}
        </button>
        <button
          onClick={handleExportar}
          disabled={exportandoXLSX}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            exportandoXLSX ? 'bg-blue-400 text-white cursor-default scale-95' : 'bg-blue-600 hover:bg-blue-700 text-white hover:scale-105 active:scale-95'
          }`}
        >
          <Download size={15} className={exportandoXLSX ? 'animate-bounce' : ''} />
          {exportandoXLSX ? 'Gerando...' : 'XLSX'}
        </button>
        <button
          onClick={handleExportarPDF}
          disabled={exportandoPDF}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            exportandoPDF ? 'bg-red-400 text-white cursor-default scale-95' : 'bg-red-600 hover:bg-red-700 text-white hover:scale-105 active:scale-95'
          }`}
        >
          <FileText size={15} className={exportandoPDF ? 'animate-pulse' : ''} />
          {exportandoPDF ? 'Gerando...' : 'PDF'}
        </button>
        <button
          onClick={handleNovaDieta}
          disabled={criandoNova}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            criandoNova ? 'bg-gray-300 text-gray-500 cursor-default scale-95' : 'bg-gray-100 hover:bg-gray-200 text-gray-700 hover:scale-105 active:scale-95'
          }`}
        >
          <RefreshCw size={15} className={criandoNova ? 'animate-spin' : ''} />
          {criandoNova ? 'Criando...' : 'Nova'}
        </button>
      </div>

      {/* Layout principal: 2 colunas — Animal + Resultados */}
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
        <PainelAnimal animal={dieta.animal} onChange={setAnimal} />
        <PainelResultados resultado={resultado} leite={dieta.animal.leite} precoLeite={dieta.animal.precoLeite} />
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
      <Indicadores resultado={resultado} />
    </div>
  );
}
