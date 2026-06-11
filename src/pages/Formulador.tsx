import { useState, useMemo, useEffect } from 'react';
import { Save, Download, RefreshCw, FileText, Undo2, Redo2 } from 'lucide-react';
import { useDieta } from '../context/DietaContext';
import PainelAnimal from '../components/PainelAnimal';
import ResumoDieta from '../components/ResumoDieta';
import PainelNutrientes from '../components/PainelNutrientes';
import TabelaIngredientes from '../components/TabelaIngredientes';
import Indicadores from '../components/Indicadores';
import { calcularResultados } from '../utils/calculos';
import { exportarXLSX } from '../utils/exportar';
import { exportarPDF } from '../utils/exportarPDF';

export default function Formulador() {
  const { dieta, alimentos, setAnimal, setSlot, escalarKgMN, setNome, undo, redo, podeDesfazer, podeRefazer, salvarDieta, editarAlimento, novaDieta, adicionarSlot, reordenarSlots, removerSlot } = useDieta();
  const [salvando, setSalvando] = useState(false);
  const [exportandoXLSX, setExportandoXLSX] = useState(false);
  const [exportandoPDF, setExportandoPDF] = useState(false);
  const [criandoNova, setCriandoNova] = useState(false);
  const [toastVisivel, setToastVisivel] = useState(false);
  const [toastMsg, setToastMsg] = useState('✅ Dieta salva com sucesso!');
  const [promptEdits, setPromptEdits] = useState<Map<string, { custo?: number; ms?: number }> | null>(null);

  const resultado = useMemo(
    () => calcularResultados(dieta.slots, alimentos, dieta.animal),
    [dieta.slots, dieta.animal, alimentos]
  );

  function showToast(msg: string) {
    setToastMsg(msg);
    setToastVisivel(true);
    setTimeout(() => setToastVisivel(false), 2500);
  }

  // Atalhos globais: Ctrl/Cmd+Z desfaz, Ctrl/Cmd+Shift+Z e Ctrl+Y refazem.
  // Tira o foco do input ativo antes (limpa o rascunho de digitação) para o
  // valor restaurado aparecer corretamente.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) {
        if (!podeDesfazer) return;
        e.preventDefault();
        (document.activeElement as HTMLElement | null)?.blur?.();
        undo();
      } else if ((k === 'z' && e.shiftKey) || k === 'y') {
        if (!podeRefazer) return;
        e.preventDefault();
        (document.activeElement as HTMLElement | null)?.blur?.();
        redo();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [podeDesfazer, podeRefazer, undo, redo]);

  async function handleSalvar() {
    setSalvando(true);
    try {
      await salvarDieta(dieta.nome);
      showToast('✅ Dieta salva com sucesso!');

      // R$/kg e MS% editados nesta dieta: oferece gravar também na biblioteca.
      const edits = new Map<string, { custo?: number; ms?: number }>();
      for (const s of dieta.slots) {
        if (!s.alimentoNome) continue;
        const a = alimentos.find(x => x.nome === s.alimentoNome);
        if (!a) continue;
        const e: { custo?: number; ms?: number } = {};
        if (s.custoOverride != null && s.custoOverride !== a.custo) e.custo = s.custoOverride;
        if (s.msOverride != null && s.msOverride !== a.ms) e.ms = s.msOverride;
        if (e.custo !== undefined || e.ms !== undefined) edits.set(s.alimentoNome, e);
      }
      if (edits.size > 0) setPromptEdits(edits);
    } finally {
      setSalvando(false);
    }
  }

  // Resposta do modal de edições (R$/kg e/ou MS%) por dieta
  async function aplicarEdicoesBiblioteca(salvar: boolean) {
    const map = promptEdits;
    setPromptEdits(null);
    if (salvar && map) {
      for (const [nome, e] of map) {
        const a = alimentos.find(x => x.nome === nome);
        if (!a) continue;
        await editarAlimento(nome, {
          ...a,
          ...(e.custo !== undefined ? { custo: e.custo } : {}),
          ...(e.ms !== undefined ? { ms: e.ms } : {}),
        });
      }
      showToast('💾 Alimento(s) atualizado(s) na biblioteca.');
    }
  }

  async function handleExportar() {
    setExportandoXLSX(true);
    try {
      await exportarXLSX(dieta, alimentos);
      showToast('📊 Excel gerado com sucesso!');
    } finally {
      setExportandoXLSX(false);
    }
  }

  function handleExportarPDF() {
    setExportandoPDF(true);
    try {
      exportarPDF(dieta, alimentos);
      showToast('📄 PDF gerado com sucesso!');
    } finally {
      setTimeout(() => setExportandoPDF(false), 800);
    }
  }

  function handleNovaDieta() {
    setCriandoNova(true);
    setTimeout(() => {
      novaDieta();
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

      {/* Modal — salvar edições (R$/kg e/ou MS%) na biblioteca */}
      {promptEdits && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-5 border-b border-gray-100 flex items-center gap-2">
              <span className="text-xl">💾</span>
              <h2 className="font-bold text-gray-800 text-lg">Salvar alterações na biblioteca?</h2>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm text-gray-600">
                Você ajustou <strong>{promptEdits.size} alimento(s)</strong> nesta dieta:
              </p>
              <ul className="text-sm bg-gray-50 border border-gray-100 rounded-lg p-3 space-y-1 max-h-48 overflow-y-auto">
                {[...promptEdits.entries()].map(([nome, e]) => (
                  <li key={nome} className="flex justify-between gap-3">
                    <span className="text-gray-700 truncate">{nome}</span>
                    <span className="font-semibold text-amber-700 tabular-nums whitespace-nowrap">
                      {e.custo !== undefined && <>R$ {e.custo.toFixed(3)}</>}
                      {e.custo !== undefined && e.ms !== undefined && ' · '}
                      {e.ms !== undefined && <>MS {(e.ms * 100).toFixed(1)}%</>}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-gray-500">
                <strong>Salvar na biblioteca</strong> atualiza para todas as dietas.{' '}
                <strong>Só nesta dieta</strong> mantém as alterações apenas aqui.
              </p>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-100">
              <button
                onClick={() => aplicarEdicoesBiblioteca(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Só nesta dieta
              </button>
              <button
                onClick={() => aplicarEdicoesBiblioteca(true)}
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
          value={dieta.nome}
          onChange={e => setNome(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium flex-1 min-w-[200px] max-w-xs focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="Nome da dieta..."
        />
        <div className="flex items-center gap-1">
          <button
            onClick={() => { (document.activeElement as HTMLElement | null)?.blur?.(); undo(); }}
            disabled={!podeDesfazer}
            title="Desfazer (Ctrl+Z)"
            className="flex items-center justify-center w-11 h-11 rounded-lg text-sky-700 bg-sky-100 hover:bg-sky-200 active:scale-95 disabled:text-gray-300 disabled:bg-gray-50 disabled:cursor-not-allowed transition-all"
          >
            <Undo2 size={20} />
          </button>
          <button
            onClick={() => { (document.activeElement as HTMLElement | null)?.blur?.(); redo(); }}
            disabled={!podeRefazer}
            title="Refazer (Ctrl+Shift+Z)"
            className="flex items-center justify-center w-11 h-11 rounded-lg text-sky-700 bg-sky-100 hover:bg-sky-200 active:scale-95 disabled:text-gray-300 disabled:bg-gray-50 disabled:cursor-not-allowed transition-all"
          >
            <Redo2 size={20} />
          </button>
        </div>
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

      {/* Resumo no topo — CMS, leite potencial, custos e barra de CMS */}
      <ResumoDieta resultado={resultado} leite={dieta.animal.leite} precoLeite={dieta.animal.precoLeite} />

      {/* Layout principal: Animal | Ingredientes | Nutrientes lado a lado */}
      <div className="grid grid-cols-1 xl:grid-cols-[270px_minmax(0,1.45fr)_minmax(0,0.9fr)] gap-4 items-start">
        <PainelAnimal animal={dieta.animal} onChange={setAnimal} />
        <TabelaIngredientes
          slots={dieta.slots}
          alimentos={alimentos}
          totalKgMS={resultado.totalKgMS}
          onSlotChange={setSlot}
          onAdicionarSlot={adicionarSlot}
          onReordenar={reordenarSlots}
          onRemoverSlot={removerSlot}
          onEscalar={escalarKgMN}
        />
        <div className="flex flex-col gap-4">
          <PainelNutrientes resultado={resultado} leite={dieta.animal.leite} />
          <Indicadores resultado={resultado} />
        </div>
      </div>
    </div>
  );
}
