import { useState, useRef, useEffect, useCallback, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X, ChevronDown, ChevronRight, Plus, GripVertical, Trash2, Wheat, Edit, Save, AlertTriangle } from 'lucide-react';
import type { SlotIngrediente, Alimento, IngredienteRacao, OrigemRacao } from '../types';
import { useRacao } from '../context/RacaoContext';
import type { RacaoEmConstrucao } from '../context/RacaoContext';
import { resolverAlimentoDoSlot } from '../utils/calculos.ts';
import { calcularRacao } from '../utils/calculosRacao.ts';
import ModalSalvarRacao from './racao/ModalSalvarRacao';
import ModalAdicionarIngrediente from './racao/ModalAdicionarIngrediente';

interface Props {
  slots: SlotIngrediente[];
  alimentos: Alimento[];
  totalKgMS: number;
  onSlotChange: (idx: number, partial: Partial<SlotIngrediente>) => void;
  onAdicionarSlot: () => void;
  onReordenar: (de: number, para: number) => void;
  onRemoverSlot: (idx: number) => void;
  onEscalar: (fator: number) => void;
}

function AlimentoSelect({
  value, alimentos, onChange
}: {
  value: string | null;
  alimentos: Alimento[];
  onChange: (nome: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [pos, setPos] = useState({ top: 0, left: 0, width: 280 });
  const btnRef = useRef<HTMLButtonElement>(null);

  const calcPos = useCallback(() => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setPos({
      top: r.bottom + window.scrollY + 2,
      left: r.left + window.scrollX,
      width: Math.max(r.width, 280),
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      const portal = document.getElementById('alimento-select-portal');
      if (
        btnRef.current?.contains(e.target as Node) ||
        portal?.contains(e.target as Node)
      ) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  function handleOpen() {
    calcPos();
    setQuery('');
    setOpen(o => !o);
  }

  const filtered = alimentos.filter(a =>
    a.nome.toLowerCase().includes(query.toLowerCase()) ||
    a.classificacao.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 60);

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleOpen}
        className={`w-full flex items-center justify-between gap-1 px-2 py-1.5 text-left text-xs border rounded-lg hover:border-green-400 bg-white transition-colors ${
          open ? 'border-green-500 ring-1 ring-green-300' : 'border-gray-200'
        }`}
      >
        <span className={`truncate ${value ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>
          {value ?? 'Selecionar alimento...'}
        </span>
        <ChevronDown size={12} className={`flex-shrink-0 transition-transform ${open ? 'rotate-180 text-green-500' : 'text-gray-400'}`} />
      </button>

      {open && createPortal(
        <div
          id="alimento-select-portal"
          style={{ position: 'absolute', top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
          className="bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden"
        >
          <div className="p-2 border-b border-gray-100 bg-gray-50">
            <input
              autoFocus
              type="text"
              placeholder="Buscar alimento..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
            />
          </div>
          <div className="max-h-64 overflow-y-auto">
            {value && (
              <button
                onMouseDown={e => e.preventDefault()}
                onClick={() => { onChange(null); setOpen(false); }}
                className="w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-50 flex items-center gap-1 border-b border-gray-100"
              >
                <X size={11} /> Remover seleção
              </button>
            )}
            {filtered.length === 0 && (
              <div className="px-3 py-3 text-xs text-gray-400 text-center">Nenhum resultado</div>
            )}
            {filtered.map(a => (
              <button
                key={a.nome}
                onMouseDown={e => e.preventDefault()}
                onClick={() => { onChange(a.nome); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-green-50 flex items-center justify-between gap-2 ${
                  value === a.nome ? 'bg-green-50 font-semibold text-green-800' : 'text-gray-700'
                }`}
              >
                <span className="truncate">{a.nome}</span>
                <span className={`flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  a.tipo === 'C' ? 'bg-blue-100 text-blue-700' :
                  a.tipo === 'F' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'
                }`}>{a.tipo}</span>
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

/** Formata número para exibição, removendo zeros à direita. Vazio se 0. */
function fmtNum(n: number, dec: number): string {
  if (!isFinite(n) || n === 0) return '';
  return String(parseFloat(n.toFixed(dec)));
}

/**
 * Input numérico controlado por rascunho de texto. Permite digitar "0", "0,",
 * "0.5" etc. sem o valor sumir (o número controlado coage 0 → vazio). Comita o
 * número parseado a cada tecla; mostra o rascunho enquanto focado.
 */
function EditableNum({
  value, onCommit, disabled, dec = 3, placeholder = '0', className = '',
}: {
  value: number;
  onCommit: (n: number) => void;
  disabled?: boolean;
  dec?: number;
  placeholder?: string;
  className?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft !== null ? draft : fmtNum(value, dec);
  return (
    <input
      type="text"
      inputMode="decimal"
      value={shown}
      placeholder={placeholder}
      disabled={disabled}
      onFocus={e => { setDraft(fmtNum(value, dec)); e.target.select(); }}
      onChange={e => {
        const raw = e.target.value;
        if (!/^[0-9]*[.,]?[0-9]*$/.test(raw)) return;  // só número/decimal
        setDraft(raw);
        const n = parseFloat(raw.replace(',', '.'));
        onCommit(isFinite(n) ? n : 0);
      }}
      onBlur={() => setDraft(null)}
      className={className}
    />
  );
}

/**
 * Total de kg MS editável no rodapé. Diferente do EditableNum, só aplica a escala
 * ao CONFIRMAR (Enter ou blur) — escalar a cada tecla cascatearia o total enquanto
 * digita. Ao confirmar um alvo T, escala todos os insumos por T / total_atual.
 */
function TotalMSEditavel({ total, onEscalar }: { total: number; onEscalar: (fator: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft !== null ? draft : (total > 0 ? String(parseFloat(total.toFixed(2))) : '');
  const editavel = total > 0;

  const aplicar = () => {
    if (draft === null) return;
    const alvo = parseFloat(draft.replace(',', '.'));
    if (isFinite(alvo) && alvo > 0 && total > 0) onEscalar(alvo / total);
    setDraft(null);
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={shown}
      disabled={!editavel}
      title={editavel ? 'Digite o total de MS desejado — os insumos escalam proporcionalmente' : 'Adicione insumos para poder escalar o total'}
      onFocus={e => { setDraft(String(parseFloat(total.toFixed(2)))); e.target.select(); }}
      onChange={e => {
        const raw = e.target.value;
        if (!/^[0-9]*[.,]?[0-9]*$/.test(raw)) return;
        setDraft(raw);
      }}
      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur(); } }}
      onBlur={aplicar}
      className="w-16 text-right border border-transparent hover:border-gray-300 focus:border-green-500 rounded-lg px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-green-500 bg-transparent focus:bg-white tabular-nums font-semibold text-gray-800 disabled:cursor-not-allowed"
    />
  );
}

/** % de um campo em fração 0-1 → string com 1 casa (≤3 casas em toda a tela). */
const pctNut = (v: number | null | undefined): string =>
  v == null || !isFinite(v) ? '—' : (v * 100).toFixed(1);

/**
 * Subnível expansível de uma ração na dieta (Demanda 1A). Mostra os insumos da
 * receita com kg/d EDITÁVEL e características nutricionais. Editar um kg/d grava
 * `racaoOverride` no slot (ração editada só nesta dieta) — recalcula a composição
 * na hora. A receita base vem do override (se já editada) ou do `origem_racao`.
 */
function SubtabelaRacao({
  slot, idx, alimentoEf, alimentos, onSlotChange, onEditarFormulador, onSalvarBanco,
}: {
  slot: SlotIngrediente;
  idx: number;
  alimentoEf: Alimento;
  alimentos: Alimento[];
  onSlotChange: (idx: number, partial: Partial<SlotIngrediente>) => void;
  onEditarFormulador: (slot: SlotIngrediente, alimentoEf: Alimento) => void;
  onSalvarBanco: (slot: SlotIngrediente, alimentoEf: Alimento) => void;
}) {
  const origem = alimentoEf.origem_racao!;
  // Receita-base: override (se já editada nesta dieta) senão a do banco. Mantém
  // só {alimento_nome, kg_d} — kg da batida volta ao proporcional na edição inline.
  const receita: IngredienteRacao[] = (slot.racaoOverride?.receita ?? origem.receita)
    .map(r => ({ alimento_nome: r.alimento_nome, kg_d: r.kg_d }));
  const capacidade = slot.racaoOverride?.capacidade_misturador_kg ?? origem.capacidade_misturador_kg;
  const calc = calcularRacao(receita, alimentos, capacidade);
  const [modalAdd, setModalAdd] = useState(false);

  const gravarReceita = (nova: IngredienteRacao[]) =>
    onSlotChange(idx, { racaoOverride: { receita: nova, capacidade_misturador_kg: capacidade } });

  const editarKg = (nome: string, v: number) =>
    gravarReceita(receita.map(r => r.alimento_nome === nome ? { ...r, kg_d: v } : r));

  const removerIngrediente = (nome: string) =>
    gravarReceita(receita.filter(r => r.alimento_nome !== nome));

  const adicionarIngrediente = (ing: IngredienteRacao) => {
    gravarReceita([...receita, { alimento_nome: ing.alimento_nome, kg_d: ing.kg_d }]);
    setModalAdd(false);
  };

  return (
    <div className="bg-amber-50/40 border-y border-amber-100 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[11px] font-semibold text-amber-800 flex items-center gap-1.5">
          <Wheat size={12} /> Insumos da ração — kg/d editável (só altera esta dieta)
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onEditarFormulador(slot, alimentoEf)}
            className="flex items-center gap-1 text-[11px] font-medium bg-white border border-amber-200 hover:bg-amber-100 text-amber-800 px-2 py-1 rounded"
            title="Abrir no Formulador de Ração (incluir novos insumos, etc.)"
          >
            <Edit size={11} /> Editar no formulador
          </button>
          <button
            onClick={() => onSalvarBanco(slot, alimentoEf)}
            className="flex items-center gap-1 text-[11px] font-medium bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded"
            title="Salvar no banco (sobrescrever ou gerar nova ração)"
          >
            <Save size={11} /> Salvar no banco…
          </button>
        </div>
      </div>

      <div className="bg-white border border-amber-100 rounded-lg overflow-hidden">
        <table className="w-full text-[11px]">
          <thead className="bg-amber-50 text-amber-800">
            <tr>
              <th className="text-left px-2 py-1.5 font-semibold">Ingrediente</th>
              <th className="text-right px-2 py-1.5 font-semibold w-20">kg/d</th>
              <th className="text-right px-2 py-1.5 font-semibold">% mistura</th>
              <th className="text-right px-2 py-1.5 font-semibold">MS%</th>
              <th className="text-right px-2 py-1.5 font-semibold">PB%</th>
              <th className="text-right px-2 py-1.5 font-semibold">FDN%</th>
              <th className="text-right px-2 py-1.5 font-semibold">Amido%</th>
              <th className="text-right px-2 py-1.5 font-semibold">NDT%</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-amber-50">
            {receita.map(r => {
              const ic = calc.ingredientes.find(x => x.alimento.nome === r.alimento_nome);
              const al = ic?.alimento ?? alimentos.find(x => x.nome === r.alimento_nome);
              if (!al) {
                return (
                  <tr key={r.alimento_nome} className="bg-red-50">
                    <td className="px-2 py-1.5 text-red-700">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => removerIngrediente(r.alimento_nome)}
                          className="flex-shrink-0 p-0.5 text-red-400 hover:text-red-600 hover:bg-red-100 rounded"
                          title="Remover insumo da ração"
                        >
                          <Trash2 size={11} />
                        </button>
                        <AlertTriangle size={11} /> {r.alimento_nome} (não está no banco)
                      </div>
                    </td>
                    <td colSpan={7} />
                  </tr>
                );
              }
              return (
                <tr key={r.alimento_nome} className="hover:bg-amber-50/50">
                  <td className="px-2 py-1 text-gray-800">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => removerIngrediente(r.alimento_nome)}
                        className="flex-shrink-0 p-0.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded"
                        title="Remover insumo da ração"
                      >
                        <Trash2 size={11} />
                      </button>
                      <span className="truncate">{al.nome}</span>
                    </div>
                  </td>
                  <td className="px-1 py-1">
                    <div className="flex justify-end">
                      <EditableNum
                        value={r.kg_d}
                        dec={3}
                        onCommit={v => editarKg(r.alimento_nome, v)}
                        className="w-16 text-right border border-amber-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-amber-400 tabular-nums font-semibold"
                      />
                    </div>
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums">{ic ? (ic.fracao * 100).toFixed(1) : '0.0'}%</td>
                  <td className="px-2 py-1 text-right tabular-nums text-gray-600">{pctNut(al.ms)}</td>
                  <td className="px-2 py-1 text-right tabular-nums text-gray-600">{pctNut(al.pb)}</td>
                  <td className="px-2 py-1 text-right tabular-nums text-gray-600">{pctNut(al.fdn)}</td>
                  <td className="px-2 py-1 text-right tabular-nums text-gray-600">{pctNut(al.amido)}</td>
                  <td className="px-2 py-1 text-right tabular-nums text-gray-600">{pctNut(al.ndt)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-amber-50/60 border-t border-amber-100 font-semibold text-amber-900">
            <tr>
              <td className="px-2 py-1">Ração (composição)</td>
              <td className="px-2 py-1 text-right tabular-nums">{calc.consumo_total_kg_d.toFixed(3)}</td>
              <td className="px-2 py-1 text-right tabular-nums">100%</td>
              <td className="px-2 py-1 text-right tabular-nums">{pctNut(calc.composicao.ms)}</td>
              <td className="px-2 py-1 text-right tabular-nums">{pctNut(calc.composicao.pb)}</td>
              <td className="px-2 py-1 text-right tabular-nums">{pctNut(calc.composicao.fdn)}</td>
              <td className="px-2 py-1 text-right tabular-nums">{pctNut(calc.composicao.amido)}</td>
              <td className="px-2 py-1 text-right tabular-nums">{pctNut(calc.composicao.ndt)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <button
        onClick={() => setModalAdd(true)}
        className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-amber-800 bg-white border border-amber-200 hover:bg-amber-100 px-2.5 py-1.5 rounded-lg"
      >
        <Plus size={12} /> Adicionar insumo à ração
      </button>

      {modalAdd && (
        <ModalAdicionarIngrediente
          alimentos={alimentos}
          jaAdicionados={receita.map(r => r.alimento_nome)}
          onAdd={adicionarIngrediente}
          onCancel={() => setModalAdd(false)}
        />
      )}
    </div>
  );
}

export default function TabelaIngredientes({ slots, alimentos, totalKgMS, onSlotChange, onAdicionarSlot, onReordenar, onRemoverSlot, onEscalar }: Props) {
  const [units, setUnits] = useState<Record<string, 'kg' | 'g'>>({});
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [expandido, setExpandido] = useState<Set<string>>(new Set());
  // Slot cuja ração está com o modal "Salvar no banco" aberto (com receita+capacidade).
  const [salvarBanco, setSalvarBanco] = useState<
    { idx: number; nomeBase: string; receita: IngredienteRacao[]; capacidade: number; existeNoBanco: boolean } | null
  >(null);

  const navigate = useNavigate();
  const { iniciarComIngredientes, iniciarEdicao } = useRacao();

  const toggleExpandido = (slotId: string) => {
    setExpandido(prev => {
      const novo = new Set(prev);
      if (novo.has(slotId)) novo.delete(slotId); else novo.add(slotId);
      return novo;
    });
  };

  /** Receita + capacidade efetivas de um slot de ração (override ou banco). */
  const receitaDoSlot = (slot: SlotIngrediente, alimentoEf: Alimento) => {
    const origem = alimentoEf.origem_racao!;
    const receita: IngredienteRacao[] = (slot.racaoOverride?.receita ?? origem.receita)
      .map(r => ({ alimento_nome: r.alimento_nome, kg_d: r.kg_d }));
    const capacidade = slot.racaoOverride?.capacidade_misturador_kg ?? origem.capacidade_misturador_kg;
    return { receita, capacidade };
  };

  // 1B — reabre a ração (receita efetiva, incl. edições locais) no Formulador.
  const editarNoFormulador = (slot: SlotIngrediente, alimentoEf: Alimento) => {
    const { receita, capacidade } = receitaDoSlot(slot, alimentoEf);
    const origem: OrigemRacao = {
      data_criacao: alimentoEf.origem_racao!.data_criacao,
      fazenda: alimentoEf.origem_racao!.fazenda,
      capacidade_misturador_kg: capacidade,
      receita,
    };
    iniciarEdicao(alimentoEf.nome, origem, slot.id);
    navigate('/racao');
  };

  // Abre o modal "Salvar no banco" (sobrescrever / gerar nova) para a ração do slot.
  const abrirSalvarBanco = (slot: SlotIngrediente, alimentoEf: Alimento, idx: number) => {
    const { receita, capacidade } = receitaDoSlot(slot, alimentoEf);
    setSalvarBanco({
      idx,
      nomeBase: alimentoEf.nome,
      receita,
      capacidade,
      existeNoBanco: alimentos.some(a => a.nome === alimentoEf.nome),
    });
  };

  // Slots elegíveis: têm alimento e kgMN > 0
  const slotsElegiveis = slots.filter(s => s.alimentoNome && s.kgMN > 0);
  const numSelecionados = slotsElegiveis.filter(s => selecionados.has(s.id)).length;

  const toggleSelecionado = (slotId: string) => {
    setSelecionados(prev => {
      const novo = new Set(prev);
      if (novo.has(slotId)) novo.delete(slotId); else novo.add(slotId);
      return novo;
    });
  };

  const irParaFormuladorRacao = () => {
    const selSlots = slotsElegiveis.filter(s => selecionados.has(s.id));
    if (selSlots.length === 0) return;

    // Uma única ração selecionada → abre ela em modo edição (igual ao botão do
    // subnível), com as opções de salvar (sobrescrever / nova / só nesta dieta).
    if (selSlots.length === 1) {
      const s = selSlots[0];
      const a = resolverAlimentoDoSlot(s, alimentos);
      if (a?.origem_racao) {
        editarNoFormulador(s, a);
        return;
      }
    }

    // Caso geral → monta a mistura expandindo cada ração nos seus insumos
    // (nunca leva a ração como ingrediente fechado).
    const ingredientes: { alimento_nome: string; kg_d: number }[] = [];
    for (const s of selSlots) {
      const a = resolverAlimentoDoSlot(s, alimentos);
      if (a?.origem_racao) {
        for (const r of receitaDoSlot(s, a).receita) {
          ingredientes.push({ alimento_nome: r.alimento_nome, kg_d: r.kg_d });
        }
      } else {
        ingredientes.push({ alimento_nome: s.alimentoNome!, kg_d: s.kgMN });
      }
    }
    if (ingredientes.length === 0) return;
    iniciarComIngredientes(ingredientes);
    navigate('/racao');
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* Toolbar de seleção — visível quando há slots elegíveis */}
      {slotsElegiveis.length > 0 && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-amber-50/40 border-b border-amber-100">
          <div className="text-xs text-amber-800">
            {numSelecionados > 0
              ? <span><strong>{numSelecionados}</strong> ingrediente{numSelecionados !== 1 ? 's' : ''} selecionado{numSelecionados !== 1 ? 's' : ''} para a ração</span>
              : <span className="text-gray-500">Marque os ingredientes que vão na <strong>mesma mistura/ração</strong> da fazenda</span>}
          </div>
          <button
            onClick={irParaFormuladorRacao}
            disabled={numSelecionados === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-500 hover:bg-amber-600 text-white rounded-lg disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
            title={numSelecionados === 0 ? 'Selecione ao menos 1 ingrediente' : 'Abrir Formulador de Ração com os selecionados'}
          >
            <Wheat size={13} /> Formulador de Ração ({numSelecionados})
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="w-5 px-0.5" />
              <th className="w-6 px-1 py-2.5" />
              <th className="w-7 px-1 py-2.5 text-center" title="Selecionar para a ração">
                <Wheat size={13} className="inline-block text-amber-600" />
              </th>
              <th className="text-left px-2 py-2.5 font-semibold text-gray-500 min-w-[140px]">Alimento</th>
              <th className="text-right px-2 py-2.5 font-semibold text-gray-500">kg MN</th>
              <th className="text-right px-2 py-2.5 font-semibold text-gray-500">kg MS</th>
              <th className="text-right px-2 py-2.5 font-semibold text-gray-500">MS %</th>
              <th className="text-right px-2 py-2.5 font-semibold text-gray-500">R$/kg</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {slots.map((slot, idx) => {
              // Resolve o alimento efetivo (inclui ração editada só nesta dieta).
              const alimento = resolverAlimentoDoSlot(slot, alimentos) ?? null;
              // MS% efetivo: override desta dieta quando existir, senão o do banco
              const ms = slot.msOverride ?? (alimento?.ms ?? 0);
              const kgMS = alimento ? slot.kgMN * ms : 0;

              const unit = units[slot.id] ?? 'kg';
              const isRacao = !!alimento?.origem_racao;
              const editadaLocal = !!slot.racaoOverride;
              const aberto = expandido.has(slot.id);

              const isDragging = dragIdx === idx;
              const isOver = overIdx === idx && dragIdx !== idx;

              return (
                <Fragment key={slot.id}>
                <tr
                  draggable
                  onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; setDragIdx(idx); }}
                  onDragOver={e => { e.preventDefault(); if (overIdx !== idx) setOverIdx(idx); }}
                  onDrop={e => { e.preventDefault(); if (dragIdx !== null && dragIdx !== idx) onReordenar(dragIdx, idx); setDragIdx(null); setOverIdx(null); }}
                  onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
                  className={`transition-colors ${isDragging ? 'opacity-40 bg-green-50' : isOver ? 'bg-blue-50 border-t-2 border-blue-400' : 'hover:bg-gray-50'}`}
                >
                  <td className="px-0.5 py-1.5 text-gray-300 cursor-grab active:cursor-grabbing">
                    <GripVertical size={13} />
                  </td>
                  <td className="px-1 py-1.5 text-center">
                    <button
                      onClick={() => onRemoverSlot(idx)}
                      className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="Remover ingrediente"
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                  {/* F3: célula do checkbox não participa do drag — mouseDown
                       não dispara dragstart no <tr>, e o td não é draggable. */}
                  <td
                    className="px-1 py-1.5 text-center"
                    draggable={false}
                    onMouseDown={e => e.stopPropagation()}
                    onDragStart={e => { e.preventDefault(); e.stopPropagation(); }}
                  >
                    <input
                      type="checkbox"
                      checked={selecionados.has(slot.id)}
                      disabled={!alimento || slot.kgMN <= 0}
                      onChange={() => toggleSelecionado(slot.id)}
                      className="w-3.5 h-3.5 accent-amber-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
                      title={!alimento || slot.kgMN <= 0 ? 'Preencha o alimento e quantidade para incluir na ração' : 'Incluir na ração'}
                    />
                  </td>
                  <td className="px-1 py-1">
                    <div className="flex items-center gap-1">
                      {isRacao ? (
                        <button
                          onClick={() => toggleExpandido(slot.id)}
                          className="flex-shrink-0 p-0.5 text-amber-600 hover:bg-amber-100 rounded"
                          title={aberto ? 'Recolher insumos da ração' : 'Ver/editar insumos da ração'}
                        >
                          {aberto ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      ) : null}
                      <div className="flex-1 min-w-0">
                        <AlimentoSelect
                          value={slot.alimentoNome}
                          alimentos={alimentos}
                          onChange={nome => onSlotChange(idx, { alimentoNome: nome, kgMN: nome ? slot.kgMN : 0, custoOverride: null, msOverride: null, racaoOverride: null })}
                        />
                      </div>
                    </div>
                    {editadaLocal && (
                      <span className="inline-flex items-center gap-1 mt-1 text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                        <Wheat size={9} /> editada nesta dieta
                      </span>
                    )}
                  </td>
                  <td className="px-1 py-1">
                    <div className="flex items-center justify-end gap-0.5">
                      <EditableNum
                        value={unit === 'g' ? slot.kgMN * 1000 : slot.kgMN}
                        dec={unit === 'g' ? 1 : 3}
                        disabled={!alimento}
                        onCommit={v => onSlotChange(idx, { kgMN: unit === 'g' ? v / 1000 : v })}
                        className="w-14 text-right border border-gray-200 rounded-lg px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-green-500 disabled:bg-gray-50 disabled:text-gray-300 tabular-nums font-semibold"
                      />
                      <button
                        disabled={!alimento}
                        onClick={() => setUnits(u => ({ ...u, [slot.id]: unit === 'kg' ? 'g' : 'kg' }))}
                        className={`text-[10px] font-bold px-1 py-0.5 rounded border transition-colors ${
                          !alimento
                            ? 'text-gray-300 border-gray-200 cursor-default'
                            : unit === 'g'
                            ? 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
                        }`}
                        title={`Mudar para ${unit === 'kg' ? 'gramas' : 'quilogramas'}`}
                      >
                        {unit}
                      </button>
                    </div>
                  </td>
                  {/* kg MS editável — conta inversa via MS% efetivo (ponto 3) */}
                  <td className="px-1 py-1">
                    <div className="flex justify-end">
                      <EditableNum
                        value={kgMS}
                        dec={2}
                        disabled={!alimento}
                        onCommit={v => {
                          if (alimento && ms > 0) onSlotChange(idx, { kgMN: v / ms });
                        }}
                        className="w-14 text-right border border-gray-200 rounded-lg px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-green-500 disabled:bg-gray-50 disabled:text-gray-300 tabular-nums text-gray-700"
                      />
                    </div>
                  </td>
                  {/* MS% editável — override só desta dieta (afeta toda a composição) */}
                  <td className="px-1 py-1">
                    {alimento ? (
                      <div className="flex justify-end">
                        <EditableNum
                          value={ms * 100}
                          dec={1}
                          onCommit={v => onSlotChange(idx, { msOverride: v > 0 ? v / 100 : null })}
                          className={`w-14 text-right border rounded-lg px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-green-500 tabular-nums ${
                            slot.msOverride != null && slot.msOverride !== alimento.ms
                              ? 'border-amber-300 bg-amber-50 text-amber-800 font-semibold'
                              : 'border-gray-200 text-gray-600'
                          }`}
                        />
                      </div>
                    ) : (
                      <div className="text-right text-gray-300">—</div>
                    )}
                  </td>
                  {/* R$/kg editável — override só desta dieta (ponto 4) */}
                  <td className="px-1 py-1">
                    {alimento ? (
                      <div className="flex justify-end">
                        <EditableNum
                          value={slot.custoOverride ?? alimento.custo ?? 0}
                          dec={3}
                          placeholder="0,000"
                          onCommit={v => onSlotChange(idx, { custoOverride: v })}
                          className={`w-14 text-right border rounded-lg px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-green-500 tabular-nums ${
                            slot.custoOverride != null && slot.custoOverride !== alimento.custo
                              ? 'border-amber-300 bg-amber-50 text-amber-800 font-semibold'
                              : 'border-gray-200 text-gray-600'
                          }`}
                        />
                      </div>
                    ) : (
                      <div className="text-right text-gray-300">—</div>
                    )}
                  </td>
                </tr>
                {isRacao && aberto && alimento && (
                  <tr>
                    <td colSpan={8} className="p-0">
                      <SubtabelaRacao
                        slot={slot}
                        idx={idx}
                        alimentoEf={alimento}
                        alimentos={alimentos}
                        onSlotChange={onSlotChange}
                        onEditarFormulador={editarNoFormulador}
                        onSalvarBanco={(s, a) => abrirSalvarBanco(s, a, idx)}
                      />
                    </td>
                  </tr>
                )}
                </Fragment>
              );
            })}
          </tbody>
          <tfoot className="bg-gray-100 border-t-2 border-gray-300 font-semibold">
            <tr>
              <td />
              <td colSpan={3} className="px-3 py-2 text-gray-700">TOTAL</td>
              <td className="px-2 py-2 text-right tabular-nums text-gray-800">
                {slots.reduce((s, sl) => s + sl.kgMN, 0).toFixed(2)}
              </td>
              <td className="px-1 py-2 text-right">
                <div className="flex justify-end">
                  <TotalMSEditavel total={totalKgMS} onEscalar={onEscalar} />
                </div>
              </td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Botão adicionar linha */}
      <div className="px-3 py-2 border-t border-gray-100">
        <button
          onClick={onAdicionarSlot}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-green-600 hover:bg-green-50 px-3 py-1.5 rounded-lg transition-colors font-medium"
        >
          <Plus size={13} />
          Adicionar alimento
        </button>
      </div>

      {/* Modal Salvar no banco (sobrescrever / gerar nova) a partir do subnível */}
      {salvarBanco && (() => {
        const resultado = calcularRacao(salvarBanco.receita, alimentos, salvarBanco.capacidade);
        const racaoConstr: RacaoEmConstrucao = {
          nome: salvarBanco.nomeBase,
          capacidade_misturador_kg: salvarBanco.capacidade,
          ingredientes: salvarBanco.receita,
          editando_nome: salvarBanco.existeNoBanco ? salvarBanco.nomeBase : undefined,
        };
        return (
          <ModalSalvarRacao
            racao={racaoConstr}
            resultado={resultado}
            onClose={() => setSalvarBanco(null)}
            onSaved={nomeSalvo => {
              // Sobrescreveu a ração-base → limpa o override (passa a ler do banco).
              // Gerou nova → o slot passa a apontar para a nova ração (override limpo).
              if (nomeSalvo === salvarBanco.nomeBase) {
                onSlotChange(salvarBanco.idx, { racaoOverride: null });
              } else {
                onSlotChange(salvarBanco.idx, { alimentoNome: nomeSalvo, racaoOverride: null });
              }
              setSalvarBanco(null);
            }}
          />
        );
      })()}
    </div>
  );
}
