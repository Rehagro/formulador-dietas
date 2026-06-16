import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Save, FileDown, Wheat, CheckCircle2, AlertTriangle, Undo2, Redo2 } from 'lucide-react';
import { useRacao } from '../context/RacaoContext';
import { useDieta } from '../context/DietaContext';
import { calcularRacao } from '../utils/calculosRacao';
import { exportarPDFRacao } from '../utils/exportarPDFRacao';
import TabelaIngredientesRacao from '../components/racao/TabelaIngredientesRacao';
import PainelMineraisRacao from '../components/racao/PainelMineraisRacao';
import ModalAdicionarIngrediente from '../components/racao/ModalAdicionarIngrediente';
import ModalSalvarRacao from '../components/racao/ModalSalvarRacao';
import ModalAplicarNaDieta from '../components/racao/ModalAplicarNaDieta';

export default function FormuladorRacao() {
  const { racao, atualizar, limpar, undo, redo, podeDesfazer, podeRefazer } = useRacao();
  const { alimentos } = useDieta();
  const [modalAdd, setModalAdd] = useState(false);
  const [modalSalvar, setModalSalvar] = useState(false);
  const [modalAplicar, setModalAplicar] = useState(false);
  const [toastSucesso, setToastSucesso] = useState<string | null>(null);

  // Atalhos: Ctrl/Cmd+Z desfaz, Ctrl/Cmd+Shift+Z e Ctrl+Y refazem (igual à Dieta).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.ctrlKey || e.metaKey;
      if (!meta) return;
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
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [podeDesfazer, podeRefazer, undo, redo]);

  // Toast de sucesso some sozinho. NÃO navega para fora — o usuário continua
  // com a ração recém-salva na tela (pode salvar de novo e escolher sobrescrever).
  useEffect(() => {
    if (!toastSucesso) return;
    const t = setTimeout(() => setToastSucesso(null), 2500);
    return () => clearTimeout(t);
  }, [toastSucesso]);

  // IMPORTANTE: todos os hooks ANTES de qualquer return condicional. Senão o
  // React quebra ("rendered fewer hooks than expected") quando `racao` fica null
  // — era a causa da tela branca ao salvar.
  const resultado = useMemo(
    () => calcularRacao(
      racao?.ingredientes ?? [], alimentos, racao?.capacidade_misturador_kg ?? 0),
    [racao?.ingredientes, racao?.capacidade_misturador_kg, alimentos],
  );

  // F1: welcome só quando NÃO há ração nenhuma em construção.
  // Se há ração mas sem ingredientes (ex: aluno removeu todos em modo edição),
  // mantém a tela cheia com aviso para adicionar.
  if (!racao) {
    return (
      <div className="max-w-[1600px] mx-auto px-4 py-6">
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <Wheat size={48} className="mx-auto text-amber-400 mb-3" />
          <h2 className="text-lg font-bold text-gray-800 mb-2">Formulador de Ração</h2>
          <p className="text-sm text-gray-600 mb-4">
            Use esta tela para montar uma mistura de concentrados a partir dos
            ingredientes de uma dieta. O sistema calcula a proporção e quanto
            pesar de cada um para a capacidade do seu misturador.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Para começar, vá na aba <strong>Dieta</strong>, selecione os
            ingredientes que vão na mistura e clique em <strong>Formulador
            de Ração</strong>.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700"
          >
            <ArrowLeft size={15} /> Ir para Dieta
          </Link>
        </div>
      </div>
    );
  }

  const semIngredientes = racao.ingredientes.length === 0;
  // Veio de slots de uma dieta → oferece "Aplicar na dieta" (colapsa em ração local).
  const veioDaDieta = !!racao.origem_slot_ids?.length;

  // F5: confirm antes de limpar uma ração com conteúdo (evita perda acidental)
  const limparComConfirm = () => {
    if (semIngredientes || confirm('Limpar a ração em construção? As alterações não salvas serão perdidas.')) {
      limpar();
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-4 space-y-3">
      {/* Toast de sucesso ao salvar */}
      {toastSucesso && (
        <div className="fixed top-20 right-6 z-[100] bg-emerald-600 text-white rounded-lg shadow-xl px-4 py-3 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 size={18} />
          <div className="text-sm">
            <strong>{toastSucesso}</strong> salva na biblioteca.
            <div className="text-xs opacity-80">Você pode continuar editando.</div>
          </div>
        </div>
      )}

      {/* Topo: meta dados + ações */}
      <div className="bg-white border border-gray-200 rounded-xl p-3">
        <div className="flex items-center gap-3 flex-wrap">
          <Wheat size={20} className="text-amber-500" />
          <h1 className="text-base font-bold text-gray-800">Formulador de Ração</h1>
          {racao.editando_nome && (
            <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
              Editando: {racao.editando_nome}
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-1">
              <button
                onClick={() => { (document.activeElement as HTMLElement | null)?.blur?.(); undo(); }}
                disabled={!podeDesfazer}
                title="Desfazer (Ctrl+Z)"
                className="flex items-center justify-center w-8 h-8 rounded-lg text-sky-700 bg-sky-100 hover:bg-sky-200 active:scale-95 disabled:text-gray-300 disabled:bg-gray-50 disabled:cursor-not-allowed transition-all"
              >
                <Undo2 size={16} />
              </button>
              <button
                onClick={() => { (document.activeElement as HTMLElement | null)?.blur?.(); redo(); }}
                disabled={!podeRefazer}
                title="Refazer (Ctrl+Shift+Z)"
                className="flex items-center justify-center w-8 h-8 rounded-lg text-sky-700 bg-sky-100 hover:bg-sky-200 active:scale-95 disabled:text-gray-300 disabled:bg-gray-50 disabled:cursor-not-allowed transition-all"
              >
                <Redo2 size={16} />
              </button>
            </div>
            <Link
              to="/"
              className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft size={14} /> Voltar para Dieta
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
          <label className="text-xs">
            <span className="text-gray-600">Fazenda (opcional)</span>
            <input
              type="text"
              value={racao.fazenda ?? ''}
              onChange={e => atualizar({ fazenda: e.target.value }, 'fazenda')}
              placeholder="ex: Fazenda Boa Esperança"
              className="mt-0.5 w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </label>
          <label className="text-xs">
            <span className="text-gray-600">Nome da Ração (opcional, preenchido ao salvar)</span>
            <input
              type="text"
              value={racao.nome ?? ''}
              onChange={e => atualizar({ nome: e.target.value }, 'nome')}
              placeholder="ex: Ração Lactação Alta"
              className="mt-0.5 w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </label>
          <label className="text-xs">
            <span className="text-gray-600 font-medium">Capacidade do misturador (kg) = total da batida</span>
            <input
              type="number"
              min="1"
              step="10"
              value={parseFloat(racao.capacidade_misturador_kg.toFixed(1))}
              onChange={e => atualizar({ capacidade_misturador_kg: Number(e.target.value) || 0 }, 'cap')}
              className="mt-0.5 w-full border border-amber-300 rounded-lg px-2 py-1.5 text-sm font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <span className="text-[11px] text-gray-400 mt-0.5 block">
              Define o total da batida e reescalona os kg de cada insumo mantendo o kg/d.
            </span>
          </label>
        </div>
      </div>

      {/* F7: aviso quando ingredientes da receita sumiram do banco */}
      {resultado.ingredientes_faltantes.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle size={16} className="text-orange-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-orange-900">
            <strong>Ingredientes não encontrados no banco:</strong>{' '}
            {resultado.ingredientes_faltantes.join(', ')}.
            <div className="text-orange-800 mt-1">
              Esses alimentos foram removidos da biblioteca depois que a ração foi salva.
              Os cálculos abaixo ignoram essas entradas. Adicione-os de volta na aba
              Alimentos ou remova-os da receita para que a ração reflita a realidade.
            </div>
          </div>
        </div>
      )}

      {/* F1: estado intermediário — ração existe mas está vazia */}
      {semIngredientes && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900">
            <strong>Adicione pelo menos 1 ingrediente</strong> para continuar.
            {racao.editando_nome && (
              <div className="text-amber-800 mt-1">
                Você está editando a ração <em>{racao.editando_nome}</em>. Se quiser
                descartar a edição, clique em <strong>Limpar</strong>.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabela ingredientes */}
      <TabelaIngredientesRacao
        racao={racao}
        resultado={resultado}
        onPatch={(patch, coalesceKey) => atualizar(patch, coalesceKey)}
      />

      <div className="flex justify-between flex-wrap gap-2">
        <button
          onClick={() => setModalAdd(true)}
          className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-lg text-sm font-medium"
        >
          <Plus size={14} /> Adicionar ingrediente
        </button>

        {/* Cards resumo */}
        <div className="flex gap-2 flex-wrap">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
            <div className="text-[10px] text-emerald-700 uppercase font-bold">R$/kg da mistura</div>
            <div className="text-base font-bold text-emerald-900 tabular-nums">R$ {resultado.custo_por_kg.toFixed(3)}</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
            <div className="text-[10px] text-blue-700 uppercase font-bold">R$ total da batida</div>
            <div className="text-base font-bold text-blue-900 tabular-nums">R$ {resultado.custo_total.toFixed(2)}</div>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
            <div className="text-[10px] text-gray-600 uppercase font-bold">Consumo total / animal</div>
            <div className="text-base font-bold text-gray-800 tabular-nums">{resultado.consumo_total_kg_d.toFixed(2)} kg/d</div>
          </div>
        </div>
      </div>

      {/* Minerais expansível */}
      <PainelMineraisRacao composicao={resultado.composicao} />

      {/* Ações finais */}
      <div className="flex justify-end gap-2 pt-2">
        <button
          onClick={limparComConfirm}
          className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5"
        >
          Limpar
        </button>
        <button
          onClick={() => exportarPDFRacao(resultado, {
            nome: racao.nome || 'Ração',
            fazenda: racao.fazenda,
          })}
          disabled={resultado.ingredientes.length === 0}
          className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FileDown size={14} /> Exportar PDF
        </button>
        <button
          onClick={() => setModalSalvar(true)}
          disabled={resultado.ingredientes.length === 0 || resultado.kg_batida_total <= 0}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium disabled:cursor-not-allowed ${
            veioDaDieta
              ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-50'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-gray-300'
          }`}
        >
          <Save size={14} /> Salvar na biblioteca
        </button>
        {veioDaDieta && (
          <button
            onClick={() => setModalAplicar(true)}
            disabled={resultado.ingredientes.length === 0 || resultado.consumo_total_kg_d <= 0}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-sm font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
            title="Voltar para a dieta com estes insumos colapsados numa única ração"
          >
            <ArrowLeft size={14} /> Aplicar na dieta
          </button>
        )}
      </div>

      {modalAdd && (
        <ModalAdicionarIngrediente
          alimentos={alimentos}
          jaAdicionados={racao.ingredientes.map(i => i.alimento_nome)}
          onAdd={ing => {
            atualizar({ ingredientes: [...racao.ingredientes, ing] });
            setModalAdd(false);
          }}
          onCancel={() => setModalAdd(false)}
        />
      )}

      {modalSalvar && (
        <ModalSalvarRacao
          racao={racao}
          resultado={resultado}
          onClose={() => setModalSalvar(false)}
          onSaved={(nome) => {
            setModalSalvar(false);
            setToastSucesso(nome);
            // Mantém a ração na tela vinculada à salva (modo edição): permite
            // continuar editando e, ao salvar de novo, escolher sobrescrever.
            atualizar({ nome, editando_nome: nome });
          }}
        />
      )}

      {modalAplicar && (
        <ModalAplicarNaDieta
          racao={racao}
          resultado={resultado}
          onClose={() => setModalAplicar(false)}
        />
      )}
    </div>
  );
}
