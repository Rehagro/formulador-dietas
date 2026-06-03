import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X, ChevronDown, Plus, GripVertical, Trash2, Wheat } from 'lucide-react';
import type { SlotIngrediente, Alimento } from '../types';
import { useRacao } from '../context/RacaoContext';

interface Props {
  slots: SlotIngrediente[];
  alimentos: Alimento[];
  totalKgMS: number;
  onSlotChange: (idx: number, partial: Partial<SlotIngrediente>) => void;
  onAdicionarSlot: () => void;
  onReordenar: (de: number, para: number) => void;
  onRemoverSlot: (idx: number) => void;
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

export default function TabelaIngredientes({ slots, alimentos, totalKgMS, onSlotChange, onAdicionarSlot, onReordenar, onRemoverSlot }: Props) {
  const [units, setUnits] = useState<Record<string, 'kg' | 'g'>>({});
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());

  const navigate = useNavigate();
  const { iniciarComIngredientes } = useRacao();

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
    const ingredientes = slotsElegiveis
      .filter(s => selecionados.has(s.id))
      .map(s => ({ alimento_nome: s.alimentoNome!, kg_d: s.kgMN }));
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
              <th className="text-right px-2 py-2.5 font-semibold text-gray-500">R$/kg</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {slots.map((slot, idx) => {
              const alimento = slot.alimentoNome ? alimentos.find(a => a.nome === slot.alimentoNome) : null;
              const kgMS = alimento ? slot.kgMN * alimento.ms : 0;

              const unit = units[slot.id] ?? 'kg';

              const isDragging = dragIdx === idx;
              const isOver = overIdx === idx && dragIdx !== idx;

              return (
                <tr
                  key={slot.id}
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
                    <AlimentoSelect
                      value={slot.alimentoNome}
                      alimentos={alimentos}
                      onChange={nome => onSlotChange(idx, { alimentoNome: nome, kgMN: nome ? slot.kgMN : 0, custoOverride: null })}
                    />
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
                  {/* kg MS editável — conta inversa via MS% do alimento (ponto 3) */}
                  <td className="px-1 py-1">
                    <div className="flex justify-end">
                      <EditableNum
                        value={kgMS}
                        dec={2}
                        disabled={!alimento}
                        onCommit={v => {
                          if (alimento && alimento.ms > 0) onSlotChange(idx, { kgMN: v / alimento.ms });
                        }}
                        className="w-14 text-right border border-gray-200 rounded-lg px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-green-500 disabled:bg-gray-50 disabled:text-gray-300 tabular-nums text-gray-700"
                      />
                    </div>
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
              <td className="px-2 py-2 text-right tabular-nums text-gray-800">
                {totalKgMS.toFixed(2)}
              </td>
              <td />
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
    </div>
  );
}
