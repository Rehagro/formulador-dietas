import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronDown, Plus, GripVertical } from 'lucide-react';
import type { SlotIngrediente, Alimento } from '../types';
import { calcularNelAlimento } from '../utils/calculos';

interface Props {
  slots: SlotIngrediente[];
  alimentos: Alimento[];
  totalKgMS: number;
  onSlotChange: (idx: number, partial: Partial<SlotIngrediente>) => void;
  onAdicionarSlot: () => void;
  onReordenar: (de: number, para: number) => void;
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

export default function TabelaIngredientes({ slots, alimentos, totalKgMS, onSlotChange, onAdicionarSlot, onReordenar }: Props) {
  const [units, setUnits] = useState<Record<string, 'kg' | 'g'>>({});
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="w-6 px-1" />
              <th className="text-left px-3 py-2.5 font-semibold text-gray-500 w-8">#</th>
              <th className="text-left px-3 py-2.5 font-semibold text-gray-500 min-w-[220px]">Alimento</th>
              <th className="text-right px-2 py-2.5 font-semibold text-gray-500">kg MN</th>
              <th className="text-right px-2 py-2.5 font-semibold text-gray-500">kg MS</th>
              <th className="text-right px-2 py-2.5 font-semibold text-gray-500">% MS dieta</th>
              <th className="text-right px-2 py-2.5 font-semibold text-gray-500">MS %</th>
              <th className="text-right px-2 py-2.5 font-semibold text-gray-500">NEl</th>
              <th className="text-right px-2 py-2.5 font-semibold text-gray-500">PB %</th>
              <th className="text-right px-2 py-2.5 font-semibold text-gray-500">FDN %</th>
              <th className="text-right px-2 py-2.5 font-semibold text-gray-500">Amido %</th>
              <th className="text-right px-2 py-2.5 font-semibold text-gray-500">R$/kg</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {slots.map((slot, idx) => {
              const alimento = slot.alimentoNome ? alimentos.find(a => a.nome === slot.alimentoNome) : null;
              const kgMS = alimento ? slot.kgMN * alimento.ms : 0;
              const pctMS = totalKgMS > 0 && kgMS > 0 ? (kgMS / totalKgMS) * 100 : 0;

              const unit = units[slot.id] ?? 'kg';
              const displayVal = unit === 'g'
                ? (slot.kgMN ? parseFloat((slot.kgMN * 1000).toFixed(1)) : '')
                : (slot.kgMN || '');

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
                  <td className="px-1 py-1.5 text-gray-300 cursor-grab active:cursor-grabbing">
                    <GripVertical size={14} />
                  </td>
                  <td className="px-3 py-1.5 text-gray-400 tabular-nums">{idx + 1}</td>
                  <td className="px-2 py-1">
                    <AlimentoSelect
                      value={slot.alimentoNome}
                      alimentos={alimentos}
                      onChange={nome => onSlotChange(idx, { alimentoNome: nome, kgMN: nome ? slot.kgMN : 0 })}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        step={unit === 'g' ? 1 : 0.001}
                        value={displayVal}
                        placeholder="0"
                        disabled={!alimento}
                        onFocus={e => e.target.select()}
                        onChange={e => {
                          const v = parseFloat(e.target.value) || 0;
                          onSlotChange(idx, { kgMN: unit === 'g' ? v / 1000 : v });
                        }}
                        className="w-20 text-right border border-gray-200 rounded-lg px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-green-500 disabled:bg-gray-50 disabled:text-gray-300 tabular-nums font-semibold"
                      />
                      <button
                        disabled={!alimento}
                        onClick={() => setUnits(u => ({ ...u, [slot.id]: unit === 'kg' ? 'g' : 'kg' }))}
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded border transition-colors ${
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
                  <td className="px-2 py-1.5 text-right tabular-nums text-gray-700">
                    {kgMS > 0 ? kgMS.toFixed(2) : '—'}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-gray-700">
                    {pctMS > 0 ? pctMS.toFixed(1) + '%' : '—'}
                  </td>
                  {alimento ? (
                    <>
                      <td className="px-2 py-1.5 text-right tabular-nums text-gray-600">{(alimento.ms * 100).toFixed(1)}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-gray-600">{calcularNelAlimento(alimento).toFixed(3)}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-gray-600">{(alimento.pb * 100).toFixed(2)}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-gray-600">{alimento.fdn !== null ? (alimento.fdn * 100).toFixed(1) : '—'}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-gray-600">{alimento.amido !== null ? (alimento.amido * 100).toFixed(1) : '—'}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-gray-600">{alimento.custo !== null ? alimento.custo.toFixed(3) : '—'}</td>
                    </>
                  ) : (
                    Array.from({ length: 6 }).map((_, i) => (
                      <td key={i} className="px-2 py-1.5 text-right text-gray-300">—</td>
                    ))
                  )}
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-gray-100 border-t-2 border-gray-300 font-semibold">
            <tr>
              <td />
              <td colSpan={2} className="px-3 py-2 text-gray-700">TOTAL</td>
              <td className="px-2 py-2 text-right tabular-nums text-gray-800">
                {slots.reduce((s, sl) => s + sl.kgMN, 0).toFixed(2)}
              </td>
              <td className="px-2 py-2 text-right tabular-nums text-gray-800">
                {totalKgMS.toFixed(2)}
              </td>
              <td colSpan={7} />
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
