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
  const { dieta, alimentos, setAnimal, setSlot, salvarDieta, editarAlimento, novaDieta, adicionarSlot, reordenarSlots, removerSlot } = useDieta();
  const [nomeDieta, setNomeDieta] = useState(dieta.nome);
  const [salvando, setSalvando] = useState(false);
  const [exportandoXLSX, setExportandoXLSX] = useState(false);
  const [exportandoPDF, setExportandoPDF] = useState(false);
  const [criandoNova, setCriandoNova] = useState(false);
  const [toastVisivel, setToastVisivel] = useState(false);
  const [toastMsg, setToastMsg] = useState('✅ Dieta salva com sucesso!');
  const [promptCustos, setPromptCustos] = useState<Map<string, number> | null>(null);

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

      // Ponto 4 — R$/kg editado nesta dieta: oferece gravar também na biblioteca.
      const overridePorNome = new Map<string, number>();
      for (const s of dieta.slots) {
        if (s.custoOverride == null || !s.alimentoNome) continue;
        const a = alimentos.find(x => x.nome === s.alimentoNome);
        if (a && s.custoOverride !== a.custo) overridePorNome.set(s.alimentoNome, s.custoOverride);
      }
      if (overridePorNome.size > 0) setPromptCustos(overridePorNome);
    } finally {
      setSalvando(false);
    }
  }

  // Resposta do modal de preços editados (ponto 4)
  async function aplicarCustosBiblioteca(salvar: boolean) {
    const map = promptCustos;
    setPromptCustos(null);
    if (salvar && map) {
      for (const [nome, custo] of map) {
        const a = alimentos.find(x => x.nome === nome);
        if (a) await editarAlimento(nome, { ...a, custo });
      }
      showToast('💲 R$/kg atualizado na biblioteca.');
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

      {/* Modal — salvar R$/kg editado na biblioteca (ponto 4) */}
      {promptCustos && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-5 border-b border-gray-100 flex items-center gap-2">
              <span className="text-xl">💲</span>
              <h2 className="font-bold text-gray-800 text-lg">Salvar preço na biblioteca?</h2>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm text-gray-600">
                Você ajustou o <strong>R$/kg</strong> de {promptCustos.size} alimento(s) nesta dieta:
              </p>
              <ul className="text-sm bg-gray-50 border border-gray-100 rounded-lg p-3 space-y-1 max-h-48 overflow-y-auto">
                {[...promptCustos.entries()].map(([nome, custo]) => (
                  <li key={nome} className="flex justify-between gap-3">
                    <span className="text-gray-700 truncate">{nome}</span>
                    <span className="font-semibold text-amber-700 tabular-nums whitespace-nowrap">R$ {custo.toFixed(3)}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-gray-500">
                <strong>Salvar na biblioteca</strong> atualiza o preço para todas as dietas.{' '}
                <strong>Só nesta dieta</strong> mantém o preço apenas aqui.
              </p>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-100">
              <button
                onClick={() => aplicarCustosBiblioteca(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Só nesta dieta
              </button>
              <button
                onClick={() => aplicarCustosBiblioteca(true)}
                className="px-4 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg font-medium"
              >
                Salvar na biblioteca
              </button>
            </div>
          </div>
        </div>
      )}

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
        onRemoverSlot={removerSlot}
      />

      {/* Indicadores */}
      <Indicadores resultado={resultado} />
    </div>
  );
}
